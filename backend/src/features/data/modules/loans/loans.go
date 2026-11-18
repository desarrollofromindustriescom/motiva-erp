package loans

import (
	"context"
	"errors"
	"math"
	"slices"
	"strconv"
	"strings"
	"time"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/modules/folio"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// stored percentages are multiplied by 1000 (10% -> 10000)
const rateScale int64 = 100_000

type rate struct {
	id    uuid.UUID
	value int64
}

// money that leaves one place for a loan, in cents
type investorFund struct {
	id     uuid.UUID
	amount int64
}

type funds struct {
	general   int64
	investors []investorFund
}

func toCents(value float64) (int64, bool) {
	scaled := value * 100

	if math.Abs(scaled-math.Round(scaled)) > 1e-6 {
		return 0, false
	}

	return int64(math.Round(scaled)), true
}

/**
 * Day (at 00:00) of the payment number `number` of a loan that starts on `from`: a week
 * after the previous one on weekly loans (same weekday) & a month after on monthly ones
 * (same day of the month, or the last day of a shorter month: Jan 31 -> Feb 28)
 */
func paymentDate(from time.Time, loanType string, number int) time.Time {
	year, month, day := from.Date()

	if loanType != repository.LnTypeMonthly {
		return time.Date(year, month, day+7*number, 0, 0, 0, 0, from.Location())
	}

	// day 0 of the next month is the last day of the month
	last := time.Date(year, month+time.Month(number)+1, 0, 0, 0, 0, 0, from.Location())

	return time.Date(last.Year(), last.Month(), min(day, last.Day()), 0, 0, 0, 0, from.Location())
}

/**
 * Moment a loan is over: when the day of its last payment ends. The investments
 * used for it must close after it.
 */
func endDate(from time.Time, loanType string, noPayments int) time.Time {
	return paymentDate(from, loanType, noPayments).AddDate(0, 0, 1)
}

/**
 * Creates the payments of an approved loan, all of them pending: the regular amount
 * for each one except the last, which takes what is left so they add up to the total
 */
func createPayments(ctx context.Context, tx pgx.Tx, loanID uuid.UUID, loanType string, noPayments int, total int64, payment int64, from time.Time) error {
	amounts := make([]int32, noPayments)
	dates := make([]time.Time, noPayments)

	for i := range noPayments {
		amounts[i] = int32(payment)
		dates[i] = paymentDate(from, loanType, i+1)
	}

	amounts[noPayments-1] = int32(total - payment*int64(noPayments-1))

	_, err := tx.Exec(ctx, repository.LnQryInsertPayments, amounts, dates, loanID)

	return err
}

func validTerms(loanType string, noPayments int) bool {
	switch loanType {
	case repository.LnTypeMonthly:
		return noPayments >= 1 && noPayments <= repository.LnMaxMonthlyPayments
	case repository.LnTypeWeekly:
		return noPayments >= 1 && noPayments <= repository.LnMaxWeeklyPayments
	}

	return false
}

func settingSlug(loanType string, kind string, noPayments int) string {
	return loanType + "_loan_" + kind + "_" + strconv.Itoa(noPayments)
}

type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func activeSetting(ctx context.Context, db querier, slug string) (*rate, error) {
	found := &rate{}

	if err := db.QueryRow(ctx, repository.LnQryActiveSetting, slug).Scan(&found.id, &found.value); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrRateNotFound
		}

		return nil, err
	}

	return found, nil
}

/**
 * Total to pay (cents) of a loan & what each payment is: the rate is
 * applied once over the amount & the total is split between the payments
 */
func quote(amount int64, rateValue int64, noPayments int) (total int64, payment int64) {
	total = (amount*(rateScale+rateValue) + rateScale/2) / rateScale
	payment = (total + int64(noPayments)/2) / int64(noPayments)

	return total, payment
}

/**
 * Interest of some terms & the money that can be lent to a loan with them:
 * the general cash balance & the investors with free money in investments
 * that close after the last payment
 */
func GetFunds(ctx context.Context, loanType string, noPayments int) (*controller.LoanFundsPreview, error) {
	if !validTerms(loanType, noPayments) {
		return nil, repository.LnErrPaymentsInvalid
	}

	pool := database.GetPool()

	interest, err := activeSetting(ctx, pool, settingSlug(loanType, "rate", noPayments))

	if err != nil {
		return nil, err
	}

	preview := &controller.LoanFundsPreview{
		Rate:      float64(interest.value) / 1000,
		Investors: []*controller.LoanInvestorFundPreview{},
	}

	var general int

	if err = pool.QueryRow(ctx, repository.CbQryGetGeneralBalance).Scan(&general, new(time.Time)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	preview.GeneralAvailable = float64(general) / 100

	rows, err := pool.Query(ctx, repository.LnQryFundsInvestors, endDate(time.Now(), loanType, noPayments))

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	for rows.Next() {
		var available int64

		item := &controller.LoanInvestorFundPreview{}

		if err = rows.Scan(&item.ID, &item.Fullname, &available); err != nil {
			return nil, err
		}

		item.Available = float64(available) / 100
		preview.Investors = append(preview.Investors, item)
	}

	return preview, rows.Err()
}

func parseFunds(payload *controller.LoanFundsPayload) (*funds, error) {
	result := &funds{investors: []investorFund{}}

	general, ok := toCents(payload.General)

	if !ok {
		return nil, repository.LnErrFundsMismatch
	}

	result.general = general

	seen := map[uuid.UUID]bool{}

	for _, item := range payload.Investors {
		id, err := uuid.Parse(item.InvestorID)
		amount, ok := toCents(item.Amount)

		// an investor can only be once, so its funds are always distributed together
		if err != nil || !ok || amount <= 0 || seen[id] {
			return nil, repository.LnErrFundsMismatch
		}

		seen[id] = true
		result.investors = append(result.investors, investorFund{id: id, amount: amount})
	}

	// always lock the balances in the same order
	slices.SortFunc(result.investors, func(a, b investorFund) int {
		return strings.Compare(a.id.String(), b.id.String())
	})

	return result, nil
}

/**
 * Takes the money of the funds for a loan, in the transaction of its approval:
 * - the general cash balance is locked first & the investors after it, one by one
 * - the money of an investor is taken from its eligible investments, the ones with
 *   the longest term first, so one investor can give money from several of them
 * - each place has its own withdrawal with the loan that receives it, a detail of
 *   the loan & the amount that leaves the balance (& the investment)
 */
func takeFunds(ctx context.Context, tx pgx.Tx, executor *models.User, loanID uuid.UUID, loanType string, noPayments int, amount int64, interest *rate, taken *funds) error {
	var total int64 = taken.general

	for _, item := range taken.investors {
		total += item.amount
	}

	if total != amount {
		return repository.LnErrFundsMismatch
	}

	now := time.Now()
	limit := endDate(now, loanType, noPayments)

	investorRate, err := activeSetting(ctx, tx, settingSlug(loanType, "investor", noPayments))

	if err != nil {
		return err
	}

	move := func(balanceID uuid.UUID, investmentID *uuid.UUID, cents int64) error {
		number, err := folio.NextMovement(ctx, tx)

		if err != nil {
			return err
		}

		_, err = tx.Exec(ctx, repository.LnQryInsertMovement, number, int(cents), balanceID, investmentID, loanID, executor.ID)

		return err
	}

	if taken.general > 0 {
		var (
			balanceID uuid.UUID
			current   int
			noOwner   *uuid.UUID
		)

		if err = tx.QueryRow(ctx, repository.CbQryLockBalance, noOwner).Scan(&balanceID, &current); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return repository.CbErrNotFound
			}

			return err
		}

		if taken.general > int64(current) {
			return repository.LnErrFundsInsufficent
		}

		if err = move(balanceID, nil, taken.general); err != nil {
			return err
		}

		if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, int(int64(current)-taken.general), now, balanceID); err != nil {
			return err
		}

		// the general cash has no investor percentage
		if _, err = tx.Exec(ctx, repository.LnQryInsertDetail, int(taken.general), nil, nil, balanceID, loanID); err != nil {
			return err
		}
	}

	for _, item := range taken.investors {
		var (
			balanceID uuid.UUID
			current   int
		)

		if err = tx.QueryRow(ctx, repository.LnQryLockInvestorBalance, item.id).Scan(&balanceID, &current); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return repository.LnErrFundsInsufficent
			}

			return err
		}

		rows, err := tx.Query(ctx, repository.LnQryEligibleInvestments, balanceID, limit)

		if err != nil {
			return err
		}

		type part struct {
			id     uuid.UUID
			amount int64
		}

		var (
			parts     []part
			remaining = item.amount
		)

		for rows.Next() {
			var (
				investmentID uuid.UUID
				free         int64
			)

			if err = rows.Scan(&investmentID, &free); err != nil {
				rows.Close()
				return err
			}

			if remaining == 0 {
				continue
			}

			share := part{id: investmentID, amount: min(free, remaining)}

			parts = append(parts, share)
			remaining -= share.amount
		}

		rows.Close()

		if err = rows.Err(); err != nil {
			return err
		}

		// not enough free money in the investments that can be used
		if remaining > 0 || item.amount > int64(current) {
			return repository.LnErrFundsInsufficent
		}

		for _, share := range parts {
			if err = move(balanceID, &share.id, share.amount); err != nil {
				return err
			}

			if _, err = tx.Exec(ctx, repository.LnQryUpdateInvestment, int(share.amount), now, share.id); err != nil {
				return err
			}

			if _, err = tx.Exec(ctx, repository.LnQryInsertDetail, int(share.amount), investorRate.id, share.id, balanceID, loanID); err != nil {
				return err
			}
		}

		if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, int(int64(current)-item.amount), now, balanceID); err != nil {
			return err
		}
	}

	return nil
}

func preview(id uuid.UUID, number string, amount int64, loanType string, noPayments int, interest *rate, status string) *controller.LoanPreview {
	total, payment := quote(amount, interest.value, noPayments)

	return &controller.LoanPreview{
		ID:         id,
		Folio:      strings.TrimSpace(number),
		Amount:     float64(amount) / 100,
		Type:       loanType,
		NoPayments: noPayments,
		Rate:       float64(interest.value) / 1000,
		Total:      float64(total) / 100,
		PaymentAmt: float64(payment) / 100,
		Status:     status,
	}
}

/**
 * Creates a loan in one transaction. Without funds it is saved as pending (no
 * money moves). With funds it is approved right away: the money is taken from
 * the funds & the loan is active, with the user that approves as its resolver.
 */
func Create(ctx context.Context, executor *models.User, payload *controller.NewLoanPayload) (*controller.LoanPreview, error) {
	return save(ctx, executor, payload, nil)
}

/**
 * Changes a pending loan (borrower, amount, type & number of payments, ex: because the
 * borrower or the lenders changed) & continues it: without funds it stays pending, with
 * them it is approved the same way as a new one. It keeps its folio & request date.
 */
func Update(ctx context.Context, executor *models.User, id uuid.UUID, payload *controller.NewLoanPayload) (*controller.LoanPreview, error) {
	return save(ctx, executor, payload, &id)
}

// registers a new loan or, with an id, replaces the data of a pending one
func save(ctx context.Context, executor *models.User, payload *controller.NewLoanPayload, existing *uuid.UUID) (*controller.LoanPreview, error) {
	amount, ok := toCents(payload.Amount)

	if !ok {
		return nil, repository.LnErrFundsMismatch
	}

	if !validTerms(payload.Type, payload.NoPayments) {
		return nil, repository.LnErrPaymentsInvalid
	}

	borrowerID, err := uuid.Parse(payload.BorrowerID)

	if err != nil {
		return nil, repository.LnErrBorrowerInvalid
	}

	var taken *funds

	if payload.Funds != nil {
		if taken, err = parseFunds(payload.Funds); err != nil {
			return nil, err
		}
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	if err = tx.QueryRow(ctx, repository.LnQryActiveBorrower, borrowerID).Scan(new(int)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrBorrowerInvalid
		}

		return nil, err
	}

	interest, err := activeSetting(ctx, tx, settingSlug(payload.Type, "rate", payload.NoPayments))

	if err != nil {
		return nil, err
	}

	total, payment := quote(amount, interest.value, payload.NoPayments)

	if total > int64(repository.CbMaxAmountCents) {
		return nil, repository.LnErrAmountTooLarge
	}

	var (
		loanID uuid.UUID
		number string
	)

	now := time.Now()

	if existing == nil {
		if number, err = folio.NextLoan(ctx, tx); err != nil {
			return nil, err
		}

		if err = tx.QueryRow(ctx, repository.LnQryInsert, number, now, int(amount), payload.Type, payload.NoPayments, interest.id, borrowerID).Scan(&loanID); err != nil {
			return nil, err
		}
	} else {
		// only a pending loan can change, it is locked so it can't be approved at the same time
		if err = tx.QueryRow(ctx, repository.LnQryLockPending, *existing).Scan(&loanID, &number, new(int), new(string), new(int), new(uuid.UUID)); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, repository.LnErrNotPending
			}

			return nil, err
		}

		if _, err = tx.Exec(ctx, repository.LnQryUpdate, loanID, int(amount), payload.Type, payload.NoPayments, interest.id, borrowerID); err != nil {
			return nil, err
		}
	}

	status := "pending"

	if taken != nil {
		if err = takeFunds(ctx, tx, executor, loanID, payload.Type, payload.NoPayments, amount, interest, taken); err != nil {
			return nil, err
		}

		if _, err = tx.Exec(ctx, repository.LnQryActivate, loanID, now, executor.ID); err != nil {
			return nil, err
		}

		if err = createPayments(ctx, tx, loanID, payload.Type, payload.NoPayments, total, payment, now); err != nil {
			return nil, err
		}

		status = "active"
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return preview(loanID, number, amount, payload.Type, payload.NoPayments, interest, status), nil
}

/**
 * Approves a pending loan with the funds chosen for it, same as creating it with funds
 */
func Approve(ctx context.Context, executor *models.User, loanID uuid.UUID, payload *controller.LoanFundsPayload) (*controller.LoanPreview, error) {
	taken, err := parseFunds(payload)

	if err != nil {
		return nil, err
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	var (
		number     string
		amount     int
		loanType   string
		noPayments int
		rateID     uuid.UUID
	)

	if err = tx.QueryRow(ctx, repository.LnQryLockPending, loanID).Scan(&loanID, &number, &amount, &loanType, &noPayments, &rateID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrNotPending
		}

		return nil, err
	}

	// the loan keeps the interest it was requested with
	interest, err := settingByID(ctx, tx, rateID)

	if err != nil {
		return nil, err
	}

	if err = takeFunds(ctx, tx, executor, loanID, loanType, noPayments, int64(amount), interest, taken); err != nil {
		return nil, err
	}

	now := time.Now()

	if _, err = tx.Exec(ctx, repository.LnQryActivate, loanID, now, executor.ID); err != nil {
		return nil, err
	}

	total, payment := quote(int64(amount), interest.value, noPayments)

	if err = createPayments(ctx, tx, loanID, loanType, noPayments, total, payment, now); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return preview(loanID, number, int64(amount), loanType, noPayments, interest, "active"), nil
}

/**
 * Setting a loan points to, even when it was replaced by a newer one
 */
func settingByID(ctx context.Context, db querier, id uuid.UUID) (*rate, error) {
	found := &rate{id: id}

	if err := db.QueryRow(ctx, repository.LnQrySettingByID, id).Scan(&found.value); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrRateNotFound
		}

		return nil, err
	}

	return found, nil
}

/**
 * One page of loans with the combined filters of the table
 */
func GetPage(ctx context.Context, payload *controller.LoansQueryPayload) (*controller.LoansPagePreview, error) {
	pool := database.GetPool()
	borrowers := make([]uuid.UUID, 0, len(payload.Borrowers))

	for _, value := range payload.Borrowers {
		id, err := uuid.Parse(value)

		if err != nil {
			return nil, repository.LnErrBorrowerInvalid
		}

		borrowers = append(borrowers, id)
	}

	args := []any{
		escapeLike(strings.TrimSpace(payload.Search)),
		borrowers,
		payload.IssueFrom, payload.IssueTo,
		payload.SettleFrom, payload.SettleTo,
		payload.RateMin, payload.RateMax,
		payload.PaymentsMin, payload.PaymentsMax,
		orEmpty(payload.WeeklyDays), orEmpty(payload.MonthlyDays),
		payload.WithVisits, payload.WithMora,
		payload.Type,
		orEmpty(payload.Payments),
		orEmpty(payload.Statuses),
		payload.AmountMin, payload.AmountMax,
		payload.TotalMin, payload.TotalMax,
	}

	result := &controller.LoansPagePreview{
		Items: []*controller.LoanRowPreview{},
		Page:  payload.Page,
		Size:  payload.Size,
	}

	if err := pool.QueryRow(ctx, repository.LnQryCount, args...).Scan(&result.Total); err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, repository.LnQryGet, append(args, payload.Order, payload.Size, (payload.Page-1)*payload.Size)...)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	for rows.Next() {
		var amount, total, rateValue int64

		item := &controller.LoanRowPreview{
			Borrower: &controller.LoanBorrowerPreview{},
			Status:   &controller.LoanStatusPreview{},
		}

		err = rows.Scan(
			&item.ID,
			&item.Folio,
			&item.Borrower.ID,
			&item.Borrower.Fullname,
			&item.Status.Slug,
			&item.Type,
			&amount,
			&total,
			&rateValue,
			&item.NoPayments,
			&item.CreatedAt,
		)

		if err != nil {
			return nil, err
		}

		item.Folio = strings.TrimSpace(item.Folio)
		item.Status.Title = repository.LnStatusTitles[item.Status.Slug]
		item.Amount = float64(amount) / 100
		item.Total = float64(total) / 100
		item.Rate = float64(rateValue) / 1000

		result.Items = append(result.Items, item)
	}

	return result, rows.Err()
}

// a nil slice would be sent as NULL, the query expects an empty array
func orEmpty[T any](values []T) []T {
	if values == nil {
		return []T{}
	}

	return values
}

// escapes the LIKE wildcards so the search term is taken literally
func escapeLike(term string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(term)
}

func trimmedPtr(value *string) *string {
	if value == nil {
		return nil
	}

	result := strings.TrimSpace(*value)

	return &result
}

// part of `value` that is `share` of `whole`, rounded to cents
func proportion(value int64, share int64, whole int64) int64 {
	if whole <= 0 {
		return 0
	}

	return int64(math.Round(float64(value) * float64(share) / float64(whole)))
}

/**
 * Everything of one loan for its detail dialog. What has been paid back is split like this:
 * - the payments pay the capital & the interest in the same proportion as the total to pay
 * - each place that lent money gets the part of both that matches what it lent
 * - the interest of an investor is divided between what the investor earns (its own
 *   percentage) & the commission (the rest of the loan percentage)
 */
func GetByID(ctx context.Context, id uuid.UUID) (*controller.LoanDetailPreview, error) {
	pool := database.GetPool()

	var amount, total, rateValue int64

	detail := &controller.LoanDetailPreview{
		Status:   &controller.LoanStatusPreview{},
		Borrower: &controller.LoanBorrowerDetailPreview{},
	}

	err := pool.QueryRow(ctx, repository.LnQryGetByID, id).Scan(
		&detail.ID,
		&detail.Folio,
		&detail.Status.Slug,
		&detail.Type,
		&amount,
		&total,
		&rateValue,
		&detail.NoPayments,
		&detail.RequestDate,
		&detail.ResolutionDate,
		&detail.Borrower.ID,
		&detail.Borrower.Fullname,
		&detail.Borrower.Username,
		&detail.Borrower.PhoneNumber,
		&detail.Borrower.CURP,
		&detail.Borrower.Address,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrNotFound
		}

		return nil, err
	}

	detail.Folio = strings.TrimSpace(detail.Folio)
	detail.Status.Title = repository.LnStatusTitles[detail.Status.Slug]
	detail.Borrower.CURP = trimmedPtr(detail.Borrower.CURP)
	detail.Rate = float64(rateValue) / 1000
	detail.Amount = float64(amount) / 100
	detail.Total = float64(total) / 100
	detail.Investors = []*controller.LoanLenderPreview{}

	var paid int64

	if err = pool.QueryRow(ctx, repository.LnQryPaid, id).Scan(&detail.FulfilledPayments, &paid); err != nil {
		return nil, err
	}

	capital := proportion(paid, amount, total)
	interest := paid - capital

	detail.PaidCapital = float64(capital) / 100
	detail.PaidInterest = float64(interest) / 100
	detail.Current = float64(paid) / 100

	return detail, loadLenders(ctx, detail, id, amount, rateValue)
}

type lenderGroup struct {
	preview *controller.LoanLenderPreview
	balance uuid.UUID
	lent    int64
}

/**
 * Fills the places that lent money to the loan with what each one lent, owes & has got.
 * The share of each one is calculated like every payment was split (same rounding), what the
 * investors received is what really entered their balances & the rest of their shares is commission.
 */
func loadLenders(ctx context.Context, detail *controller.LoanDetailPreview, id uuid.UUID, amount int64, rateValue int64) error {
	pool := database.GetPool()

	rows, err := pool.Query(ctx, repository.LnQryLenders, id)

	if err != nil {
		return err
	}

	defer rows.Close()

	// one group for the general cash balance & one for every investor, in the order of the payment split
	groups := []*lenderGroup{}
	byBalance := map[uuid.UUID]*lenderGroup{}

	for rows.Next() {
		var (
			fullname, username *string
			lent               int64
			balance            uuid.UUID
		)

		if err = rows.Scan(&fullname, &username, &lent, &balance); err != nil {
			return err
		}

		group, exists := byBalance[balance]

		if !exists {
			group = &lenderGroup{balance: balance, preview: &controller.LoanLenderPreview{Fullname: fullname, Username: username}}
			byBalance[balance] = group
			groups = append(groups, group)
		}

		group.lent += lent
	}

	if err = rows.Err(); err != nil {
		return err
	}

	rows.Close()

	// what each group has been paid: every payment made is divided between them
	lents := make([]int64, len(groups))
	shares := make([]int64, len(groups))

	for i, group := range groups {
		lents[i] = group.lent
	}

	payments, err := pool.Query(ctx, repository.LnQryLoanDeposits, id)

	if err != nil {
		return err
	}

	defer payments.Close()

	for payments.Next() {
		var value int64

		if err = payments.Scan(&value); err != nil {
			return err
		}

		for i, part := range distribute(value, lents) {
			shares[i] += part
		}
	}

	if err = payments.Err(); err != nil {
		return err
	}

	payments.Close()

	deposited := map[uuid.UUID]int64{}

	totals, err := pool.Query(ctx, repository.LnQryDepositedByBalance, id)

	if err != nil {
		return err
	}

	defer totals.Close()

	for totals.Next() {
		var (
			balance uuid.UUID
			value   int64
		)

		if err = totals.Scan(&balance, &value); err != nil {
			return err
		}

		deposited[balance] = value
	}

	if err = totals.Err(); err != nil {
		return err
	}

	var (
		generalPaid, commission int64
		generalLent             int64
		hasGeneral              bool
	)

	for i, group := range groups {
		lender := group.preview

		lender.Lent = float64(group.lent) / 100
		lender.Debt = float64((group.lent*(rateScale+rateValue)+rateScale/2)/rateScale) / 100
		lender.Paid = float64(shares[i]) / 100

		if lender.Username == nil {
			hasGeneral = true
			generalPaid += shares[i]
			generalLent += group.lent

			continue
		}

		received := deposited[group.balance]
		kept := max(shares[i]-received, 0)

		lender.Received = float64(received) / 100
		lender.Commission = float64(kept) / 100
		commission += kept

		detail.Investors = append(detail.Investors, lender)
	}

	// the general cash balance shows up when it lent money or when it got commissions
	if hasGeneral || commission > 0 {
		detail.General = &controller.LoanLenderPreview{
			Lent:       float64(generalLent) / 100,
			Debt:       float64((generalLent*(rateScale+rateValue)+rateScale/2)/rateScale) / 100,
			Paid:       float64(generalPaid) / 100,
			Received:   float64(generalPaid+commission) / 100,
			Commission: float64(commission) / 100,
		}
	}

	return nil
}

type paymentRow struct {
	preview *controller.LoanPaymentPreview
	// cents, what the payment costs & what has been paid to it
	amount int64
	paid   int64
	// its day has passed
	overdue bool
}

type rowsQuerier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func (row *paymentRow) debt() int64 {
	return row.amount - row.paid
}

/**
 * Payments of a loan in order, each one with the state it is in. The next one is the
 * first that isn't paid in full, it is the only one that can receive a payment.
 */
func loadPayments(ctx context.Context, db rowsQuerier, id uuid.UUID) ([]*paymentRow, error) {
	rows, err := db.Query(ctx, repository.LnQryPayments, id)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	payments := []*paymentRow{}
	next := true

	for rows.Next() {
		var (
			lastPaid   *time.Time
			hasCapital bool
		)

		row := &paymentRow{preview: &controller.LoanPaymentPreview{Number: len(payments) + 1}}

		if err = rows.Scan(&row.preview.ID, &row.amount, &row.preview.ExpectedDate, &row.paid, &lastPaid, &hasCapital, &row.overdue); err != nil {
			return nil, err
		}

		row.preview.Amount = float64(row.amount) / 100
		row.preview.Paid = float64(row.paid) / 100

		switch {
		case row.paid >= row.amount && hasCapital:
			row.preview.State, row.preview.PaidDate = "capital", lastPaid
		case row.paid >= row.amount:
			row.preview.State, row.preview.PaidDate = "paid", lastPaid
		case row.paid > 0:
			row.preview.State = "partial"
		case row.overdue:
			row.preview.State = "expired"
		default:
			row.preview.State = "pending"
		}

		if row.paid < row.amount && next {
			row.preview.IsNext = true
			next = false
		}

		payments = append(payments, row)
	}

	return payments, rows.Err()
}

func previews(rows []*paymentRow) []*controller.LoanPaymentPreview {
	result := make([]*controller.LoanPaymentPreview, 0, len(rows))

	for _, row := range rows {
		result = append(result, row.preview)
	}

	return result
}

/**
 * Payments of a loan in order, each one with the state it is in
 */
func GetPayments(ctx context.Context, id uuid.UUID) ([]*controller.LoanPaymentPreview, error) {
	pool := database.GetPool()

	if err := pool.QueryRow(ctx, repository.LnQryExists, id).Scan(new(int)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrNotFound
		}

		return nil, err
	}

	rows, err := loadPayments(ctx, pool, id)

	if err != nil {
		return nil, err
	}

	return previews(rows), nil
}

/**
 * Pays part or all of the debt of the next payment of an active loan, in one transaction:
 * - the loan is locked so two payments can't be made at the same time
 * - only the next payment (the first that isn't paid in full) can be paid, never more than it owes
 * - it is saved as a payment detail: late when the day of the payment has passed, regular if not
 * - when the payment is paid in full it is marked as executed, & when it was the last one
 *   the loan is finished
 * - the money enters the balances of the places that lent it (see splitPayment): one deposit
 *   for the general cash balance, one for the commission & one for every investment, which also
 *   gets back its money (current amount) & its gain (current reward)
 * Returns the payments of the loan updated.
 */
func PayPayment(ctx context.Context, executor *models.User, loanID uuid.UUID, paymentID uuid.UUID, amount float64) ([]*controller.LoanPaymentPreview, error) {
	cents, ok := toCents(amount)

	if !ok || cents <= 0 {
		return nil, repository.LnErrPaymentAmount
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	var loanAmount, rateValue int64

	if err = tx.QueryRow(ctx, repository.LnQryLockActive, loanID).Scan(new(uuid.UUID), &loanAmount, &rateValue); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrNotActive
		}

		return nil, err
	}

	rows, err := loadPayments(ctx, tx, loanID)

	if err != nil {
		return nil, err
	}

	var target *paymentRow

	pending := 0

	for _, row := range rows {
		if row.preview.ID == paymentID {
			target = row
		}

		if row.paid < row.amount {
			pending++
		}
	}

	if target == nil {
		return nil, repository.LnErrNotFound
	}

	if !target.preview.IsNext {
		return nil, repository.LnErrPaymentNotNext
	}

	if cents > target.debt() {
		return nil, repository.LnErrPaymentExceeds
	}

	kind := "regular"

	if target.overdue {
		kind = "late"
	}

	if _, err = tx.Exec(ctx, repository.LnQryInsertPaymentDetail, int(cents), kind, time.Now(), paymentID); err != nil {
		return nil, err
	}

	total, _ := quote(loanAmount, rateValue, 1)

	if err = depositPayment(ctx, tx, executor, loanID, paymentID, cents, loanAmount, total); err != nil {
		return nil, err
	}

	if cents == target.debt() {
		if _, err = tx.Exec(ctx, repository.LnQryExecutePayment, paymentID); err != nil {
			return nil, err
		}

		// it was the last payment that wasn't paid
		if pending == 1 {
			if _, err = tx.Exec(ctx, repository.LnQryFinish, loanID); err != nil {
				return nil, err
			}
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return GetPayments(ctx, loanID)
}

/**
 * Deposits the money of a payment in the balances of the places that lent the loan.
 * The general cash balance is locked first & the investors after it, always in the same
 * order, like when the money of a loan is taken.
 */
func depositPayment(ctx context.Context, tx pgx.Tx, executor *models.User, loanID uuid.UUID, paymentID uuid.UUID, cents int64, loanAmount int64, total int64) error {
	rows, err := tx.Query(ctx, repository.LnQryLoanLenders, loanID)

	if err != nil {
		return err
	}

	lenders := []lender{}

	for rows.Next() {
		var item lender

		if err = rows.Scan(&item.lent, &item.balanceID, &item.investmentID, &item.userID, &item.percentage, &item.weight); err != nil {
			rows.Close()
			return err
		}

		lenders = append(lenders, item)
	}

	rows.Close()

	if err = rows.Err(); err != nil {
		return err
	}

	result := splitPayment(cents, loanAmount, total, lenders)

	var (
		noOwner   *uuid.UUID
		generalID uuid.UUID
		generalAt int
	)

	if err = tx.QueryRow(ctx, repository.CbQryLockBalance, noOwner).Scan(&generalID, &generalAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return repository.CbErrNotFound
		}

		return err
	}

	deposit := func(balanceID uuid.UUID, investmentID *uuid.UUID, amount int64) error {
		number, err := folio.NextMovement(ctx, tx)

		if err != nil {
			return err
		}

		_, err = tx.Exec(ctx, repository.LnQryInsertDeposit, number, int(amount), balanceID, investmentID, paymentID, executor.ID)

		return err
	}

	now := time.Now()
	generalNext := int64(generalAt) + result.general + result.commission

	if generalNext > int64(repository.CbMaxAmountCents) {
		return repository.CbErrLimit
	}

	if result.general > 0 {
		if err = deposit(generalID, nil, result.general); err != nil {
			return err
		}
	}

	if result.commission > 0 {
		if err = deposit(generalID, nil, result.commission); err != nil {
			return err
		}
	}

	if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, int(generalNext), now, generalID); err != nil {
		return err
	}

	// the balances of the investors, locked in order of their id
	received := map[uuid.UUID]int64{}
	order := []uuid.UUID{}

	for _, item := range result.investments {
		if _, exists := received[item.balanceID]; !exists {
			order = append(order, item.balanceID)
		}

		received[item.balanceID] += item.amount
	}

	owners := map[uuid.UUID]uuid.UUID{}

	for _, item := range lenders {
		if item.userID != nil {
			owners[item.balanceID] = *item.userID
		}
	}

	slices.SortFunc(order, func(a, b uuid.UUID) int { return strings.Compare(owners[a].String(), owners[b].String()) })

	for _, balanceID := range order {
		var (
			lockedID uuid.UUID
			current  int
			owner    = owners[balanceID]
		)

		if err = tx.QueryRow(ctx, repository.CbQryLockBalance, &owner).Scan(&lockedID, &current); err != nil {
			return err
		}

		next := int64(current) + received[balanceID]

		if next > int64(repository.CbMaxAmountCents) {
			return repository.CbErrLimit
		}

		for _, item := range result.investments {
			if item.balanceID != balanceID || item.amount <= 0 {
				continue
			}

			investmentID := item.investmentID

			if err = deposit(balanceID, &investmentID, item.amount); err != nil {
				return err
			}

			if _, err = tx.Exec(ctx, repository.LnQryReturnInvestment, int(item.amount), int(item.reward), now, investmentID); err != nil {
				return err
			}
		}

		if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, int(next), now, balanceID); err != nil {
			return err
		}
	}

	return nil
}

/**
 * Page of the payments made to one payment of a loan (oldest first) with the sum of all of them
 */
func GetPaymentDeposits(ctx context.Context, loanID uuid.UUID, paymentID uuid.UUID, page int, size int) (*controller.LoanDepositsPagePreview, error) {
	pool := database.GetPool()

	if err := pool.QueryRow(ctx, repository.LnQryPaymentOfLoan, paymentID, loanID).Scan(new(int)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrNotFound
		}

		return nil, err
	}

	var sum int64

	result := &controller.LoanDepositsPagePreview{Items: []*controller.LoanDepositPreview{}, Page: page, Size: size}

	if err := pool.QueryRow(ctx, repository.LnQryDepositsTotal, paymentID).Scan(&result.Total, &sum); err != nil {
		return nil, err
	}

	result.Sum = float64(sum) / 100

	rows, err := pool.Query(ctx, repository.LnQryDeposits, paymentID, size, (page-1)*size)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	for rows.Next() {
		var amount int64

		item := &controller.LoanDepositPreview{}

		if err = rows.Scan(&item.ID, &item.Date, &item.Type, &amount); err != nil {
			return nil, err
		}

		item.Amount = float64(amount) / 100
		result.Items = append(result.Items, item)
	}

	return result, rows.Err()
}
