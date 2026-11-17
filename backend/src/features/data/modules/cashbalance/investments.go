package cashbalance

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/modules/folio"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

/**
 * Terms (in months) an investment can be opened for
 */
func GetActiveCycles(ctx context.Context) ([]*controller.CashCyclePreview, error) {
	rows, err := database.GetPool().Query(ctx, repository.CbQryGetActiveCycles)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	cycles := []*controller.CashCyclePreview{}

	for rows.Next() {
		cycle := &controller.CashCyclePreview{}

		if err = rows.Scan(&cycle.ID, &cycle.RewardCycle, &cycle.Weight); err != nil {
			return nil, err
		}

		cycles = append(cycles, cycle)
	}

	return cycles, rows.Err()
}

/**
 * Page of every investment of an investor (the active ones first, then the
 * newest). Amounts are stored in cents.
 */
func GetInvestorInvestments(ctx context.Context, id uuid.UUID, profiles []string, page int, size int) (*controller.InvestmentsPagePreview, error) {
	if _, err := loadInvestor(ctx, id, profiles); err != nil {
		return nil, err
	}

	pool := database.GetPool()
	result := &controller.InvestmentsPagePreview{
		Items: []*controller.InvestmentPreview{},
		Page:  page,
		Size:  size,
	}

	if err := pool.QueryRow(ctx, repository.CbQryCountInvestments, id).Scan(&result.Total); err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, repository.CbQryGetInvestments, id, size, (page-1)*size)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	for rows.Next() {
		var initial, current, reward int

		item := &controller.InvestmentPreview{Status: &controller.MovementStatusPreview{}}

		err = rows.Scan(
			&item.ID,
			&item.Folio,
			&initial,
			&current,
			&reward,
			&item.CreatedAt,
			&item.LastUpdate,
			&item.ClosedAt,
			&item.RewardCycle,
			&item.Status.Slug,
			&item.Status.Title,
		)

		if err != nil {
			return nil, err
		}

		item.Folio = strings.TrimSpace(item.Folio)
		item.InitialAmount = float64(initial) / 100
		item.CurrentAmount = float64(current) / 100
		item.CurrentReward = float64(reward) / 100

		result.Items = append(result.Items, item)
	}

	return result, rows.Err()
}

/**
 * Opens an investment with part of the balance of an investor, in one
 * transaction: it locks the balance, checks the amount against the available
 * balance (total minus the active investments), computes the closing date
 * from the term & registers it with its folio. current_amount & current_reward
 * start in 0 because that money will be used on loans. Returns the updated balance.
 */
func CreateInvestorInvestment(ctx context.Context, id uuid.UUID, profiles []string, amount float64, cycleID uuid.UUID) (*controller.InvestorBalancePreview, error) {
	if _, err := loadInvestor(ctx, id, profiles); err != nil {
		return nil, err
	}

	cents := int(math.Round(amount * 100))

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	var (
		balanceID uuid.UUID
		current   int
		invested  int64
		months    int
	)

	if err = tx.QueryRow(ctx, repository.CbQryLockBalance, &id).Scan(&balanceID, &current); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrNotFound
		}

		return nil, err
	}

	if err = tx.QueryRow(ctx, repository.CbQryInvestedByBalance, balanceID).Scan(&invested); err != nil {
		return nil, err
	}

	if int64(cents) > int64(current)-invested {
		return nil, repository.CbErrInvestmentExceeds
	}

	if err = tx.QueryRow(ctx, repository.CbQryGetActiveCycle, cycleID).Scan(&months); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.CbErrCycleNotFound
		}

		return nil, err
	}

	folioValue, err := folio.NextInvestment(ctx, tx)

	if err != nil {
		return nil, err
	}

	now := time.Now()

	if _, err = tx.Exec(ctx, repository.CbQryInsertInvestment, folioValue, cents, now, now.AddDate(0, months, 0), cycleID, balanceID); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return GetInvestorBalance(ctx, id, profiles)
}
