package cashbalance

import (
	"context"
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
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
 * Folder where the documents of the cancellation requests are stored,
 * taken from the environment so production can mount a volume there
 */
func documentsDir() string {
	dir := os.Getenv(repository.EnvUploadsDir)

	if dir == "" {
		dir = repository.CcDefaultUploadsDir
	}

	return filepath.Join(dir, repository.CcDocumentsDir)
}

/**
 * Stores the uploaded pdf using the document id as its name, so no
 * value from the user is part of the path. Fails if the file exists.
 */
func saveDocument(document uuid.UUID, header *multipart.FileHeader) (string, error) {
	dir := documentsDir()

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	source, err := header.Open()

	if err != nil {
		return "", err
	}

	defer source.Close()

	target := filepath.Join(dir, document.String()+".pdf")

	file, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o640)

	if err != nil {
		return "", err
	}

	if _, err = io.Copy(file, source); err != nil {
		file.Close()
		os.Remove(target)

		return "", err
	}

	if err = file.Close(); err != nil {
		os.Remove(target)

		return "", err
	}

	return target, nil
}

/**
 * Creates a cancellation request of one or more active investments of an
 * investor, in one transaction: it locks the balance (so two requests can't
 * be made at the same time), checks there is no pending request, checks every
 * investment is active & from the investor, registers the request as pending
 * (without response date) with one detail per investment & stores the pdf.
 * Returns the updated balance of the investor.
 */
func CreateCancellation(ctx context.Context, id uuid.UUID, profiles []string, message string, investments []uuid.UUID, header *multipart.FileHeader) (*controller.InvestorBalancePreview, error) {
	if _, err := loadInvestor(ctx, id, profiles); err != nil {
		return nil, err
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	var (
		balanceID uuid.UUID
		current   int
		pending   bool
		owned     int
		requestID uuid.UUID
	)

	if err = tx.QueryRow(ctx, repository.CbQryLockBalance, &id).Scan(&balanceID, &current); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	if err = tx.QueryRow(ctx, repository.CcQryPendingByUser, id).Scan(&pending); err != nil {
		return nil, err
	}

	if pending {
		return nil, repository.CcErrPending
	}

	if err = tx.QueryRow(ctx, repository.CcQryCountActiveOwned, investments, id).Scan(&owned); err != nil {
		return nil, err
	}

	if owned != len(investments) {
		return nil, repository.CcErrInvestmentsInvalid
	}

	document := uuid.New()

	if err = tx.QueryRow(ctx, repository.CcQryInsert, document, message).Scan(&requestID); err != nil {
		return nil, err
	}

	if _, err = tx.Exec(ctx, repository.CcQryInsertDetails, investments, requestID); err != nil {
		return nil, err
	}

	path, err := saveDocument(document, header)

	if err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		os.Remove(path)

		return nil, err
	}

	return GetInvestorBalance(ctx, id, profiles)
}

/**
 * Anything that can run a query: the pool or a transaction
 */
type queryer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

/**
 * Investment of a request with its amounts in cents, so the
 * sums are exact (the preview has them in currency units)
 */
type requestInvestment struct {
	preview *controller.InvestmentPreview
	initial int
	current int
	reward  int
}

/**
 * Investments a cancellation request applies to
 */
func readRequestInvestments(ctx context.Context, source queryer, query string, requestID uuid.UUID) ([]*requestInvestment, error) {
	rows, err := source.Query(ctx, query, requestID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	items := []*requestInvestment{}

	for rows.Next() {
		item := &requestInvestment{preview: &controller.InvestmentPreview{Status: &controller.MovementStatusPreview{}}}

		err = rows.Scan(
			&item.preview.ID,
			&item.preview.Folio,
			&item.initial,
			&item.current,
			&item.reward,
			&item.preview.CreatedAt,
			&item.preview.LastUpdate,
			&item.preview.ClosedAt,
			&item.preview.RewardCycle,
			&item.preview.Status.Slug,
			&item.preview.Status.Title,
		)

		if err != nil {
			return nil, err
		}

		item.preview.Folio = strings.TrimSpace(item.preview.Folio)
		item.preview.InitialAmount = float64(item.initial) / 100
		item.preview.CurrentAmount = float64(item.current) / 100
		item.preview.CurrentReward = float64(item.reward) / 100

		items = append(items, item)
	}

	return items, rows.Err()
}

/**
 * Pending cancellation request of an investor for the review dialog: its
 * investments & totals, and whether the general cash balance can cover the
 * total amount requested (the initial amount of every investment)
 */
func GetPendingCancellation(ctx context.Context, id uuid.UUID, profiles []string) (*controller.CancellationPreview, error) {
	if _, err := loadInvestor(ctx, id, profiles); err != nil {
		return nil, err
	}

	pool := database.GetPool()
	preview := &controller.CancellationPreview{Investments: []*controller.InvestmentPreview{}}

	var document uuid.UUID

	err := pool.QueryRow(ctx, repository.CcQryGetPending, id).Scan(&preview.ID, &document, &preview.Message, &preview.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CcErrNoPending
		}

		return nil, err
	}

	items, err := readRequestInvestments(ctx, pool, repository.CcQryRequestInvestments, preview.ID)

	if err != nil {
		return nil, err
	}

	var initial, recovered, reward int64

	for _, item := range items {
		initial += int64(item.initial)
		// the current amount includes the reward, what was recovered is the rest
		recovered += int64(item.current) - int64(item.reward)
		reward += int64(item.reward)

		preview.Investments = append(preview.Investments, item.preview)
	}

	var general int

	if err = pool.QueryRow(ctx, repository.CbQryGetGeneralBalance).Scan(&general, new(time.Time)); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	preview.TotalInitial = float64(initial) / 100
	preview.TotalRecovered = float64(recovered) / 100
	preview.TotalReward = float64(reward) / 100
	preview.GeneralAvailable = float64(general) / 100
	preview.CanApprove = int64(general) >= initial && initial > 0

	return preview, nil
}

/**
 * Path of the pdf of a request of the investor (any status). The name is the
 * document id read from the database, never a value of the request.
 */
func GetCancellationDocumentPath(ctx context.Context, id uuid.UUID, requestID uuid.UUID, profiles []string) (string, error) {
	if _, err := loadInvestor(ctx, id, profiles); err != nil {
		return "", err
	}

	var document uuid.UUID

	if err := database.GetPool().QueryRow(ctx, repository.CcQryDocumentOfOwner, requestID, id).Scan(&document); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", repository.CcErrNoPending
		}

		return "", err
	}

	path := filepath.Join(documentsDir(), document.String()+".pdf")

	if _, err := os.Stat(path); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", repository.CcErrDocumentMissing
		}

		return "", err
	}

	return path, nil
}

/**
 * Rejects a pending request: it is only marked as rejected with its response date,
 * no money moves & the investments stay active
 */
func RejectCancellation(ctx context.Context, id uuid.UUID, requestID uuid.UUID, profiles []string) (*controller.InvestorBalancePreview, error) {
	if _, err := loadInvestor(ctx, id, profiles); err != nil {
		return nil, err
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	var locked uuid.UUID

	if err = tx.QueryRow(ctx, repository.CcQryLockPending, requestID, id).Scan(&locked); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CcErrNoPending
		}

		return nil, err
	}

	if _, err = tx.Exec(ctx, repository.CcQryRespond, requestID, "rejected", time.Now()); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return GetInvestorBalance(ctx, id, profiles)
}

/**
 * Approves a pending request, in one transaction with both balances locked.
 * With I the sum of the initial amounts, C the sum of the current amounts (they
 * include the reward) and G the sum of the rewards, R = C - G is what was recovered:
 * - the general cash balance must have at least I available
 * - G is transferred from the investor balance to the general one: a withdrawal on
 *   the first & a deposit on the second, both with the same folio
 * - R is withdrawn from the investor balance (the money it has of the investments)
 * - I - R (what is still lent) is withdrawn from the general cash balance
 * - the investments are cancelled (they keep their amounts as history) & the
 *   request is approved
 * Movements with no amount aren't registered, all of them with the user that approves.
 */
func ApproveCancellation(ctx context.Context, executor *models.User, id uuid.UUID, requestID uuid.UUID, profiles []string) (*controller.InvestorBalancePreview, error) {
	if _, err := loadInvestor(ctx, id, profiles); err != nil {
		return nil, err
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	var locked uuid.UUID

	if err = tx.QueryRow(ctx, repository.CcQryLockPending, requestID, id).Scan(&locked); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CcErrNoPending
		}

		return nil, err
	}

	items, err := readRequestInvestments(ctx, tx, repository.CcQryLockRequestInvestments, requestID)

	if err != nil {
		return nil, err
	}

	if len(items) == 0 {
		return nil, repository.CcErrInvestmentsInvalid
	}

	var initial, current, reward int64

	ids := make([]uuid.UUID, 0, len(items))

	for _, item := range items {
		// the reward is part of the current amount, so it can't be greater
		if item.preview.Status.Slug != "active" || item.reward > item.current {
			return nil, repository.CcErrInvestmentsInvalid
		}

		initial += int64(item.initial)
		current += int64(item.current)
		reward += int64(item.reward)

		ids = append(ids, item.preview.ID)
	}

	var (
		generalID       uuid.UUID
		generalAmount   int
		investorID      uuid.UUID
		investorAmount  int
		noOwner         *uuid.UUID
		investorOwnerID = id
	)

	// the general balance is locked first, the investor one second, always in that order
	if err = tx.QueryRow(ctx, repository.CbQryLockBalance, noOwner).Scan(&generalID, &generalAmount); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	if err = tx.QueryRow(ctx, repository.CbQryLockBalance, &investorOwnerID).Scan(&investorID, &investorAmount); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	// the cash of the system must have the whole amount requested
	if int64(generalAmount) < initial {
		return nil, repository.CcErrGeneralInsufficient
	}

	recovered := current - reward
	lent := max(initial-recovered, 0)

	if reward > int64(repository.CbMaxAmountCents) || recovered > int64(repository.CbMaxAmountCents) || lent > int64(repository.CbMaxAmountCents) {
		return nil, repository.CbErrLimit
	}

	// the investor loses all its current amount (the reward & the recovered part);
	// the general balance receives the reward and pays what is still lent
	investorAfter := int64(investorAmount) - current
	generalAfter := int64(generalAmount) + reward - lent

	if investorAfter < 0 {
		return nil, repository.CcErrInvestorInsufficient
	}

	if generalAfter < 0 || generalAfter > int64(repository.CbMaxAmountCents) {
		return nil, repository.CbErrLimit
	}

	now := time.Now()

	nextFolio := func() (string, error) {
		return folio.NextMovement(ctx, tx)
	}

	register := func(number string, balanceID uuid.UUID, amount int64, movement string) error {
		_, err := tx.Exec(ctx, repository.CbQryInsertMovement, number, int(amount), movement, balanceID, executor.ID)

		return err
	}

	// the transfer of the reward: a withdrawal & a deposit with the same folio
	if reward > 0 {
		number, err := nextFolio()

		if err != nil {
			return nil, err
		}

		if err = register(number, investorID, reward, repository.CbMovementWithdrawal); err != nil {
			return nil, err
		}

		if err = register(number, generalID, reward, repository.CbMovementDeposit); err != nil {
			return nil, err
		}
	}

	if recovered > 0 {
		number, err := nextFolio()

		if err != nil {
			return nil, err
		}

		if err = register(number, investorID, recovered, repository.CbMovementWithdrawal); err != nil {
			return nil, err
		}
	}

	if lent > 0 {
		number, err := nextFolio()

		if err != nil {
			return nil, err
		}

		if err = register(number, generalID, lent, repository.CbMovementWithdrawal); err != nil {
			return nil, err
		}
	}

	if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, int(investorAfter), now, investorID); err != nil {
		return nil, err
	}

	if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, int(generalAfter), now, generalID); err != nil {
		return nil, err
	}

	if _, err = tx.Exec(ctx, repository.CcQryCancelInvestments, ids, now); err != nil {
		return nil, err
	}

	if _, err = tx.Exec(ctx, repository.CcQryRespond, requestID, "aproved", now); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return GetInvestorBalance(ctx, id, profiles)
}
