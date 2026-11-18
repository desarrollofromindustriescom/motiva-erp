package kpis

import (
	"context"
	"log/slog"
	"time"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
)

// when something that changes the kpis happens, it only says so: the calculation is done after a short wait
var trigger = make(chan struct{}, 1)

/**
 * Tells the kpis they changed (a loan was approved, a payment was made, a user was created...). It never
 * waits: several calls together only make one calculation a few seconds later.
 */
func Touch() {
	select {
	case trigger <- struct{}{}:
	default:
	}
}

/**
 * Keeps the kpis up to date while the api runs: it calculates them when it starts, again after the events
 * that call Touch (waiting a little so a burst of them is one calculation) & every few minutes, which also
 * covers what changes without an event (ex: the mora of the days that pass).
 */
func Start(ctx context.Context) {
	go func() {
		refresh(ctx)

		ticker := time.NewTicker(repository.KpRefreshInterval)

		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				refresh(ctx)
			case <-trigger:
				select {
				case <-ctx.Done():
					return
				case <-time.After(repository.KpDebounce):
				}

				// what arrived while it waited is part of this calculation
				select {
				case <-trigger:
				default:
				}

				refresh(ctx)
			}
		}
	}()
}

func refresh(parent context.Context) {
	ctx, cancel := context.WithTimeout(parent, repository.KpRefreshTimeout)

	defer cancel()

	defer func() {
		if data := recover(); data != nil {
			slog.Error("Panic calculating the kpis",
				"event", "kpis.refresh",
				"recover", data,
			)
		}
	}()

	if err := Refresh(ctx); err != nil {
		slog.Error("Error calculating the kpis",
			"event", "kpis.refresh.Refresh",
			"error", err,
		)
	}
}

/**
 * Calculates every kpi from the tables of the app & stores them, in one transaction. The lock makes two
 * calculations at the same time (ex: two api instances) wait for each other.
 */
func Refresh(ctx context.Context) error {
	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return err
	}

	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, repository.KpQryLock); err != nil {
		return err
	}

	var lent, pending, investors, borrowers int64

	if err = tx.QueryRow(ctx, repository.KpQryCalculate).Scan(&lent, &pending, &investors, &borrowers); err != nil {
		return err
	}

	values := map[string]int64{
		repository.KpLoansAmount:   lent,
		repository.KpPendingAmount: pending,
		repository.KpInvestors:     investors,
		repository.KpBorrowers:     borrowers,
	}

	for slug, value := range values {
		if _, err = tx.Exec(ctx, repository.KpQryStoreMetric, slug, value); err != nil {
			return err
		}
	}

	rows, err := tx.Query(ctx, repository.KpQryCalculateWeeks)

	if err != nil {
		return err
	}

	var (
		starts  = []time.Time{}
		counts  = []int32{}
		amounts = []int64{}
	)

	for rows.Next() {
		var (
			start  time.Time
			count  int32
			amount int64
		)

		if err = rows.Scan(&start, &count, &amount); err != nil {
			rows.Close()
			return err
		}

		starts = append(starts, start)
		counts = append(counts, count)
		amounts = append(amounts, amount)
	}

	rows.Close()

	if err = rows.Err(); err != nil {
		return err
	}

	if _, err = tx.Exec(ctx, repository.KpQryStoreWeeks, starts, counts, amounts); err != nil {
		return err
	}

	if _, err = tx.Exec(ctx, repository.KpQryRemoveWeeks, starts); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

type storedWeek struct {
	loans  int
	amount int64
}

/**
 * The last weeks, the current one last: the stored ones & zeros on the weeks that had no loans
 */
func fillWeeks(stored map[string]storedWeek, currentWeek time.Time, weeks int) []*controller.KpiWeekPreview {
	result := make([]*controller.KpiWeekPreview, 0, weeks)

	for i := weeks - 1; i >= 0; i-- {
		start := currentWeek.AddDate(0, 0, -7*i).Format(time.DateOnly)
		week := stored[start]

		result = append(result, &controller.KpiWeekPreview{
			WeekStart: start,
			Loans:     week.loans,
			Amount:    float64(week.amount) / 100,
		})
	}

	return result
}

/**
 * Kpis stored for the dashboard (nothing is added up here). The first time, when nothing was calculated
 * yet, it calculates them.
 */
func Get(ctx context.Context) (*controller.KpisPreview, error) {
	pool := database.GetPool()

	values := map[string]int64{}

	var updatedAt time.Time

	read := func() error {
		clear(values)

		rows, err := pool.Query(ctx, repository.KpQryGetMetrics)

		if err != nil {
			return err
		}

		defer rows.Close()

		for rows.Next() {
			var (
				slug    string
				value   int64
				updated time.Time
			)

			if err = rows.Scan(&slug, &value, &updated); err != nil {
				return err
			}

			values[slug] = value

			if updated.After(updatedAt) {
				updatedAt = updated
			}
		}

		return rows.Err()
	}

	if err := read(); err != nil {
		return nil, err
	}

	if len(values) == 0 {
		if err := Refresh(ctx); err != nil {
			return nil, err
		}

		if err := read(); err != nil {
			return nil, err
		}
	}

	var currentWeek time.Time

	if err := pool.QueryRow(ctx, repository.KpQryCurrentWeek).Scan(&currentWeek); err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, repository.KpQryGetWeeks, currentWeek.AddDate(0, 0, -7*(repository.KpWeeks-1)))

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	stored := map[string]storedWeek{}

	for rows.Next() {
		var (
			start time.Time
			week  storedWeek
		)

		if err = rows.Scan(&start, &week.loans, &week.amount); err != nil {
			return nil, err
		}

		stored[start.Format(time.DateOnly)] = week
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return &controller.KpisPreview{
		AmountLent:      float64(values[repository.KpLoansAmount]) / 100,
		AwaitingPayment: float64(values[repository.KpPendingAmount]) / 100,
		Investors:       int(values[repository.KpInvestors]),
		Borrowers:       int(values[repository.KpBorrowers]),
		Weeks:           fillWeeks(stored, currentWeek, repository.KpWeeks),
		UpdatedAt:       updatedAt,
	}, nil
}
