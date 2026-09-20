package settings

import (
	"context"
	"log"
	"motiva-erp/backend/internal/core/database"
	"motiva-erp/backend/internal/models"
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
			&setting.Title,
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
