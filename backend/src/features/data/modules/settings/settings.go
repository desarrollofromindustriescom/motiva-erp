package settings

import (
	"context"
	"fmt"
	"math"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
)

/**
 * Converts the stored integer into its real value
 * - percentage: stored x1000
 * - monetary: stored x100
 * - weeks: stored as is
 */
func formatValue(value int, unit string) float64 {
	switch unit {
	case repository.StgUnitPercentage:
		return float64(value) / 1000
	case repository.StgUnitMonetary:
		return float64(value) / 100
	default:
		return float64(value)
	}
}

/**
 * Get every active setting with its real value
 */
func GetActiveSettings(ctx context.Context) ([]*controller.SettingPreview, error) {
	rows, err := database.GetPool().Query(ctx, repository.StgQryGetActiveSettings)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	settings := []*controller.SettingPreview{}

	for rows.Next() {
		var (
			slug  string
			value int
			unit  string
		)

		if err = rows.Scan(&slug, &value, &unit); err != nil {
			return nil, err
		}

		settings = append(settings, &controller.SettingPreview{
			Slug:  slug,
			Value: formatValue(value, unit),
			Unit:  unit,
		})
	}

	return settings, rows.Err()
}

/**
 * Converts a real value into the stored integer
 */
func rawValue(value float64, unit string) int {
	switch unit {
	case repository.StgUnitPercentage:
		return int(math.Round(value * 1000))
	case repository.StgUnitMonetary:
		return int(math.Round(value * 100))
	default:
		return int(math.Round(value))
	}
}

type item struct {
	slug  string
	value float64
	unit  string
}

/**
 * Replaces a group of settings in one transaction: current
 * active rows are deprecated (loans keep pointing to them) &
 * new active rows are inserted. An advisory lock serializes
 * concurrent updates so a group never has duplicated actives.
 */
func replaceGroup(ctx context.Context, items []item) ([]*controller.SettingPreview, error) {
	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, repository.StgQryLock); err != nil {
		return nil, err
	}

	slugs := make([]string, 0, len(items))
	values := make([]int32, 0, len(items))
	units := make([]string, 0, len(items))
	preview := make([]*controller.SettingPreview, 0, len(items))

	for _, entry := range items {
		raw := rawValue(entry.value, entry.unit)

		slugs = append(slugs, entry.slug)
		values = append(values, int32(raw))
		units = append(units, entry.unit)
		preview = append(preview, &controller.SettingPreview{
			Slug:  entry.slug,
			Value: formatValue(raw, entry.unit),
			Unit:  entry.unit,
		})
	}

	if _, err = tx.Exec(ctx, repository.StgQryDeprecate, slugs); err != nil {
		return nil, err
	}

	if _, err = tx.Exec(ctx, repository.StgQryInsert, slugs, values, units); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return preview, nil
}

/**
 *
 */
func UpdateExtras(ctx context.Context, payload *controller.ExtrasSettingsPayload) ([]*controller.SettingPreview, error) {
	return replaceGroup(ctx, []item{
		{"mora", payload.Mora, repository.StgUnitPercentage},
		{"visit", payload.Visit, repository.StgUnitMonetary},
	})
}

/**
 *
 */
func UpdateAgreements(ctx context.Context, payload *controller.AgreementsSettingsPayload) ([]*controller.SettingPreview, error) {
	return replaceGroup(ctx, []item{
		{"agreement_weekly", payload.Weekly, repository.StgUnitPercentage},
		{"agreement_weeks_before", float64(payload.WeeksBefore), repository.StgUnitWeeks},
		{"agreement_weeks_after", float64(payload.WeeksAfter), repository.StgUnitWeeks},
	})
}

/**
 * Updates investor & general percentages of a loan type (prefix: monthly_loan | biweekly_loan | weekly_loan).
 * The general one is the interest of the loan; the investor one is the part of its share of
 * every payment that the investor receives, so they aren't compared with each other.
 */
func UpdateRates(ctx context.Context, prefix string, investor []float64, general []float64) ([]*controller.SettingPreview, error) {
	items := make([]item, 0, len(investor)*2)

	for i := range investor {
		items = append(items,
			item{fmt.Sprintf("%s_investor_%d", prefix, i+1), investor[i], repository.StgUnitPercentage},
			item{fmt.Sprintf("%s_rate_%d", prefix, i+1), general[i], repository.StgUnitPercentage},
		)
	}

	return replaceGroup(ctx, items)
}
