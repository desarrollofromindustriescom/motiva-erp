package settings

import (
	"context"
	"fmt"
	"log"
	"motiva-erp/backend/internal/core/database"
	"motiva-erp/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func getActiveSettings(ctx context.Context) ([]models.Settings, error) {
	rows, err := database.GetPool().Query(ctx, getActiveSettingsQuery)

	if err != nil {
		log.Printf("Error getting settings from db: %v", err)
		return nil, err
	}

	defer rows.Close()

	settings := []models.Settings{}

	for rows.Next() {
		setting := &models.Settings{}

		if err = rows.Scan(
			&setting.ID,
			&setting.Slug,
			&setting.Value,
			&setting.Unit,
			&setting.Status.ID,
			&setting.Status.Slug,
			&setting.Status.Title,
		); err != nil {
			log.Printf("Error scanning rows data: %v", err)
			return nil, err
		}

		settings = append(settings, *setting)
	}

	return settings, nil
}

func updateSettings(data []models.StandardSettings, update string, ctx context.Context) error {
	var query string

	switch update {
	case "extra":
		query = disableExtraValuesQuery
	case "agreement":
		query = disableAgreementValuesQuery
	case "monthly":
		query = disableMonthlyValuesQuery
	case "weekly":
		query = disableWeeklyValuesQuery

	default:
		return fmt.Errorf("Invalid update option")
	}

	_, err := database.GetPool().Exec(ctx, query)

	if err != nil {
		log.Printf("Error disabling current settings: %v", err)
		return err
	}

	_, err = database.GetPool().CopyFrom(
		ctx,
		pgx.Identifier{"settings"},
		[]string{"slug", "value", "unit"},
		pgx.CopyFromSlice(len(data), func(i int) ([]any, error) {
			return []any{data[i].Slug, data[i].Value, data[i].Unit}, nil
		}),
	)

	if err != nil {
		log.Printf("Error creating new settings: %v", err)
		return err
	}

	return nil
}
