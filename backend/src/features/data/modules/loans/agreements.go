package loans

import (
	"context"
	"errors"
	"motiva-erp/backend/src/features/data/modules/kpis"
	"slices"
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

/**
 * Money of an agreement (cents): the debt is divided between the weeks & the interest (the percentage
 * of the debt) is added to every payment, so a payment is its part of the debt plus the interest.
 * `payments` has what each week costs & `total` what the borrower pays in all of them.
 */
func agreementQuote(debt int64, weeks int, rateValue int64) (payments []int64, extra int64, total int64) {
	extra = (debt*rateValue + rateScale/2) / rateScale

	equal := make([]int64, weeks)

	for i := range equal {
		equal[i] = 1
	}

	payments = distribute(debt, equal)

	for i := range payments {
		payments[i] += extra
	}

	return payments, extra, debt + int64(weeks)*extra
}

func agreementRate(ctx context.Context, db querier) (*rate, error) {
	found, err := activeSetting(ctx, db, "agreement_weekly")

	if err != nil {
		if errors.Is(err, repository.LnErrRateNotFound) {
			return nil, repository.AgErrRate
		}

		return nil, err
	}

	return found, nil
}

/**
 * The active loans of a borrower that can go to an agreement (one week of delay or more) with
 * their weeks of delay & what they owe, & the percentage of the agreements. The mora of the
 * payments that are late is generated first, so the debt is up to date.
 */
func GetAgreementLoans(ctx context.Context, borrowerID uuid.UUID) (*controller.AgreementEligiblePreview, error) {
	if err := RefreshMora(ctx, nil); err != nil {
		return nil, err
	}

	pool := database.GetPool()

	interest, err := agreementRate(ctx, pool)

	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, repository.AgQryEligible, borrowerID, []uuid.UUID{})

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	result := &controller.AgreementEligiblePreview{
		Rate:  float64(interest.value) / 1000,
		Loans: []*controller.AgreementLoanPreview{},
	}

	for rows.Next() {
		var debt int64

		item := &controller.AgreementLoanPreview{}

		if err = rows.Scan(&item.ID, &item.Folio, &item.WeeksLate, &debt); err != nil {
			return nil, err
		}

		item.Folio = strings.TrimSpace(item.Folio)
		item.Debt = float64(debt) / 100
		result.Loans = append(result.Loans, item)
	}

	return result, rows.Err()
}

type agreementLoan struct {
	id   uuid.UUID
	debt int64
}

/**
 * Starts an agreement for the loans of a borrower, in one transaction:
 * - the loans must be active, belong to the borrower & have a week of delay or more; they are locked
 * - the debt is what they owe (with mora & visits), the payments are weekly from the next week, each one
 *   the part of the debt of its week plus the interest, and they never have mora
 * - the loans are cancelled & kept as the details of the agreement
 * - the investors get back what they lent in those loans (up to it, minus what the loans already paid
 *   them): the general cash balance pays it, with an outgoing movement of the general cash & an incoming
 *   one of the investment & the balance of the investor
 */
func CreateAgreement(ctx context.Context, executor *models.User, payload *controller.NewAgreementPayload) (*controller.AgreementPreview, error) {
	if payload.Weeks < repository.AgMinWeeks || payload.Weeks > repository.AgMaxWeeks {
		return nil, repository.AgErrLoans
	}

	borrowerID, err := uuid.Parse(payload.BorrowerID)

	if err != nil {
		return nil, repository.LnErrBorrowerInvalid
	}

	ids := make([]uuid.UUID, 0, len(payload.LoanIDs))

	for _, value := range payload.LoanIDs {
		id, err := uuid.Parse(value)

		if err != nil || slices.Contains(ids, id) {
			return nil, repository.AgErrLoans
		}

		ids = append(ids, id)
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, repository.LnQryLockExtras); err != nil {
		return nil, err
	}

	if err = tx.QueryRow(ctx, repository.LnQryActiveBorrower, borrowerID).Scan(new(int)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.LnErrBorrowerInvalid
		}

		return nil, err
	}

	interest, err := agreementRate(ctx, tx)

	if err != nil {
		return nil, err
	}

	// the general cash balance is locked first & the investors after it, always in that order
	var (
		noOwner   *uuid.UUID
		generalID uuid.UUID
		generalAt int
	)

	if err = tx.QueryRow(ctx, repository.CbQryLockBalance, noOwner).Scan(&generalID, &generalAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	// the debt of the loans includes their mora up to today
	if err = accrueMora(ctx, tx, nil); err != nil {
		return nil, err
	}

	rows, err := tx.Query(ctx, repository.AgQryLockLoans, borrowerID, ids)

	if err != nil {
		return nil, err
	}

	loans := []agreementLoan{}

	var debt int64

	for rows.Next() {
		var (
			item  agreementLoan
			label string
			weeks int
		)

		if err = rows.Scan(&item.id, &label, &weeks, &item.debt); err != nil {
			rows.Close()
			return nil, err
		}

		loans = append(loans, item)
		debt += item.debt
	}

	rows.Close()

	if err = rows.Err(); err != nil {
		return nil, err
	}

	// every loan has to be one of the borrower that can go to an agreement
	if len(loans) != len(ids) || debt <= 0 {
		return nil, repository.AgErrLoans
	}

	payments, _, total := agreementQuote(debt, payload.Weeks, interest.value)

	if total > int64(repository.CbMaxAmountCents) {
		return nil, repository.LnErrAmountTooLarge
	}

	number, err := folio.NextAgreement(ctx, tx)

	if err != nil {
		return nil, err
	}

	var (
		agreementID uuid.UUID
		createdAt   time.Time
	)

	if err = tx.QueryRow(ctx, repository.AgQryInsert, number, int(debt), payload.Weeks, interest.id, borrowerID).Scan(&agreementID, &createdAt); err != nil {
		return nil, err
	}

	for _, item := range loans {
		if _, err = tx.Exec(ctx, repository.AgQryInsertDetail, int(item.debt), item.id, agreementID); err != nil {
			return nil, err
		}
	}

	if _, err = tx.Exec(ctx, repository.AgQryCancelLoans, ids); err != nil {
		return nil, err
	}

	amounts := make([]int32, payload.Weeks)
	dates := make([]time.Time, payload.Weeks)

	for i := range payments {
		amounts[i] = int32(payments[i])
		dates[i] = paymentDate(createdAt, repository.LnTypeWeekly, i+1)
	}

	if _, err = tx.Exec(ctx, repository.AgQryInsertPayments, amounts, dates, agreementID); err != nil {
		return nil, err
	}

	if err = restoreInvestors(ctx, tx, executor, ids, generalID, int64(generalAt)); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	kpis.Touch()

	return &controller.AgreementPreview{
		ID:            agreementID,
		Folio:         strings.TrimSpace(number),
		Debt:          float64(debt) / 100,
		Weeks:         payload.Weeks,
		Rate:          float64(interest.value) / 1000,
		PaymentAmount: float64(payments[0]) / 100,
		Total:         float64(total) / 100,
	}, nil
}

type restoration struct {
	loanID       uuid.UUID
	balanceID    uuid.UUID
	investmentID uuid.UUID
	owner        uuid.UUID
	amount       int64
}

/**
 * The general cash balance gives back to the investors what they lent in the cancelled loans: for every
 * investment the loans took money from it is what it lent minus what the payments of the loan already
 * deposited in it. Each one is an outgoing movement of the general cash & an incoming one (same folio) of
 * the investment & the balance of the investor, which also gets its money (current amount) back.
 */
func restoreInvestors(ctx context.Context, tx pgx.Tx, executor *models.User, loanIDs []uuid.UUID, generalID uuid.UUID, generalAt int64) error {
	rows, err := tx.Query(ctx, repository.AgQryRestorations, loanIDs)

	if err != nil {
		return err
	}

	items := []restoration{}

	var total int64

	for rows.Next() {
		var (
			item     restoration
			lent     int64
			received int64
		)

		if err = rows.Scan(&item.loanID, &lent, &item.balanceID, &item.investmentID, &item.owner, &received); err != nil {
			rows.Close()
			return err
		}

		// up to what was lent, never more
		item.amount = max(lent-received, 0)

		if item.amount > 0 {
			items = append(items, item)
			total += item.amount
		}
	}

	rows.Close()

	if err = rows.Err(); err != nil {
		return err
	}

	if total == 0 {
		return nil
	}

	if total > generalAt {
		return repository.AgErrFunds
	}

	now := time.Now()

	// the general cash balance pays all of it
	if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, int(generalAt-total), now, generalID); err != nil {
		return err
	}

	// the balances of the investors are locked in order of their owner (the rows come sorted by it)
	balances := map[uuid.UUID]int64{}

	for _, item := range items {
		if _, locked := balances[item.balanceID]; !locked {
			var (
				id      uuid.UUID
				current int
				owner   = item.owner
			)

			if err = tx.QueryRow(ctx, repository.CbQryLockBalance, &owner).Scan(&id, &current); err != nil {
				return err
			}

			balances[item.balanceID] = int64(current)
		}

		number, err := folio.NextMovement(ctx, tx)

		if err != nil {
			return err
		}

		loanID := item.loanID
		investmentID := item.investmentID

		if _, err = tx.Exec(ctx, repository.LnQryInsertMovement, number, int(item.amount), generalID, nil, loanID, executor.ID); err != nil {
			return err
		}

		if _, err = tx.Exec(ctx, repository.LnQryInsertDeposit, number, int(item.amount), item.balanceID, &investmentID, nil, executor.ID); err != nil {
			return err
		}

		if _, err = tx.Exec(ctx, repository.LnQryReturnInvestment, int(item.amount), 0, now, investmentID); err != nil {
			return err
		}

		balances[item.balanceID] += item.amount

		if balances[item.balanceID] > int64(repository.CbMaxAmountCents) {
			return repository.CbErrLimit
		}
	}

	for balanceID, amount := range balances {
		if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, int(amount), now, balanceID); err != nil {
			return err
		}
	}

	return nil
}
