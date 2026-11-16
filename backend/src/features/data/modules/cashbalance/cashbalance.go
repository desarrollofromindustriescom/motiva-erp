package cashbalance

import (
	"context"
	"errors"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"

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
