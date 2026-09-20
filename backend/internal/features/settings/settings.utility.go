package settings

import (
	"context"
	"motiva-erp/backend/internal/models"
)

func FormatValue(value int, unit string) float32 {
	switch unit {
	case "percentage":
		return float32(value) / 1000
	case "monetary":
		return float32(value) / 100
	case "weeks":
		return float32(value)
	}

	return 0
}

func GetAllSettings(ctx context.Context) ([]models.Settings, error) {
	return getActiveSettings(ctx)
}
