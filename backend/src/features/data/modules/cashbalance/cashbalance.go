package cashbalance

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/modules/folio"
	"motiva-erp/backend/src/features/data/modules/users"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

/**
 * Get the general program balance (the active one without user),
 * amount is stored in cents
 */
func GetGeneralBalance(ctx context.Context) (*controller.CashBalancePreview, error) {
	var (
		amount  int
		preview = &controller.CashBalancePreview{}
	)

	err := database.GetPool().QueryRow(ctx, repository.CbQryGetGeneralBalance).Scan(&amount, &preview.LastUpdate)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	preview.Amount = float64(amount) / 100

	return preview, nil
}

/**
 * Deposit or withdrawal on a balance (the general one when there is no owner,
 * or the one of an investor), in one transaction:
 * - locks the balance row so movements are applied one by one
 * - validates the new amount (withdrawal can't exceed the balance)
 * - updates the balance & creates the movement with its folio
 * Movement has no origin payment nor target loan
 */
func CreateMovement(ctx context.Context, user *models.User, ownerID *uuid.UUID, movement string, amount float64) (*controller.CashBalancePreview, error) {
	cents := int(math.Round(amount * 100))

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	var (
		balanceID uuid.UUID
		current   int
	)

	if err = tx.QueryRow(ctx, repository.CbQryLockBalance, ownerID).Scan(&balanceID, &current); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	next := current

	switch movement {
	case repository.CbMovementDeposit:
		next = current + cents

		if next > repository.CbMaxAmountCents {
			return nil, repository.CbErrLimit
		}
	case repository.CbMovementWithdrawal:
		next = current - cents

		if next < 0 {
			return nil, repository.CbErrInsufficient
		}
	}

	folioValue, err := folio.NextMovement(ctx, tx)

	if err != nil {
		return nil, err
	}

	now := time.Now()

	if _, err = tx.Exec(ctx, repository.CbQryUpdateBalance, next, now, balanceID); err != nil {
		return nil, err
	}

	if _, err = tx.Exec(ctx, repository.CbQryInsertMovement, folioValue, cents, movement, balanceID, user.ID); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &controller.CashBalancePreview{Amount: float64(next) / 100, LastUpdate: now}, nil
}

/**
 * Page of general balance movements, newest first. Each item
 * carries its external references (status & user who executed it)
 */
func GetMovements(ctx context.Context, ownerID *uuid.UUID, page int, size int) (*controller.MovementsPagePreview, error) {
	pool := database.GetPool()
	result := &controller.MovementsPagePreview{
		Items: []*controller.MovementPreview{},
		Page:  page,
		Size:  size,
	}

	if err := pool.QueryRow(ctx, repository.CbQryCountMovements, ownerID).Scan(&result.Total); err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, repository.CbQryGetMovements, ownerID, size, (page-1)*size)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	for rows.Next() {
		var amount int

		item := &controller.MovementPreview{
			Status: &controller.MovementStatusPreview{},
			User:   &controller.MovementUserPreview{},
		}

		err = rows.Scan(
			&item.ID,
			&item.Folio,
			&amount,
			&item.Type,
			&item.CreatedAt,
			&item.Status.Slug,
			&item.Status.Title,
			&item.User.Fullname,
			&item.User.Username,
			&item.User.Profile,
		)

		if err != nil {
			return nil, err
		}

		item.Folio = strings.TrimSpace(item.Folio)
		item.Amount = float64(amount) / 100

		result.Items = append(result.Items, item)
	}

	return result, rows.Err()
}

/**
 * Investor whose balance is going to be used. Only users in the allowed
 * profiles can be read, only investors have a balance and it is created
 * when missing (legacy investors)
 */
func loadInvestor(ctx context.Context, id uuid.UUID, profiles []string) (*controller.UserDetailPreview, error) {
	user, err := users.GetByID(ctx, id, profiles)

	if err != nil {
		return nil, err
	}

	if user.Profile != repository.ProfileInvestor {
		return nil, repository.CbErrNotInvestor
	}

	if _, err = database.GetPool().Exec(ctx, repository.CbQryEnsureInvestorBalance, id); err != nil {
		return nil, err
	}

	return user, nil
}

/**
 * Cash balance of an investor (amount is stored in cents)
 */
func GetInvestorBalance(ctx context.Context, id uuid.UUID, profiles []string) (*controller.InvestorBalancePreview, error) {
	user, err := loadInvestor(ctx, id, profiles)

	if err != nil {
		return nil, err
	}

	var amount int

	preview := &controller.InvestorBalancePreview{Fullname: user.Fullname, Since: user.CreatedAt}

	err = database.GetPool().QueryRow(ctx, repository.CbQryGetInvestorBalance, id).Scan(&amount, &preview.LastUpdate)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	preview.Amount = float64(amount) / 100

	return preview, nil
}

/**
 * Deposit or withdrawal on the balance of an investor, returns the updated
 * balance. The movement is registered with the user that executes it.
 */
func CreateInvestorMovement(ctx context.Context, executor *models.User, id uuid.UUID, profiles []string, movement string, amount float64) (*controller.InvestorBalancePreview, error) {
	user, err := loadInvestor(ctx, id, profiles)

	if err != nil {
		return nil, err
	}

	balance, err := CreateMovement(ctx, executor, &id, movement, amount)

	if err != nil {
		return nil, err
	}

	return &controller.InvestorBalancePreview{
		Fullname:   user.Fullname,
		Since:      user.CreatedAt,
		Amount:     balance.Amount,
		LastUpdate: balance.LastUpdate,
	}, nil
}

/**
 * Page of the movements of the balance of an investor (newest first)
 */
func GetInvestorMovements(ctx context.Context, id uuid.UUID, profiles []string, page int, size int) (*controller.MovementsPagePreview, error) {
	if _, err := loadInvestor(ctx, id, profiles); err != nil {
		return nil, err
	}

	return GetMovements(ctx, &id, page, size)
}
