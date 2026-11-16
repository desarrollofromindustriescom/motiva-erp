package cashbalance

import (
	"context"
	"errors"
	"math"
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
 * Deposit or withdrawal on the general balance, in one transaction:
 * - locks the balance row so movements are applied one by one
 * - validates the new amount (withdrawal can't exceed the balance)
 * - updates the balance & creates the movement with its folio
 * Movement has no origin payment nor target loan
 */
func CreateMovement(ctx context.Context, user *models.User, movement string, amount float64) (*controller.CashBalancePreview, error) {
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

	if err = tx.QueryRow(ctx, repository.CbQryLockGeneralBalance).Scan(&balanceID, &current); err != nil {
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
