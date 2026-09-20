package settings

import (
	"context"
	"fmt"
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

func formatRawSetting(value float64, unit string) int {
	switch unit {
	case "percentage":
		return int(value * 1000)
	case "monetary":
		return int(value * 100)
	case "weeks":
		return int(value)
	}

	return 0
}

func SetNewSettings(values []models.StandardSettingsRaw, update string, ctx context.Context) error {
	var length int
	data := []models.StandardSettings{}

	switch update {
	case "extra":
		length = 2
	case "agreement":
		length = 3
	case "monthly":
		length = 6
	case "weekly":
		length = 26

	default:
		return fmt.Errorf("Invalid update option")
	}

	if len(values) != length {
		return fmt.Errorf("Error invalid keys length")
	}

	for i := range len(values) {
		data = append(data, models.StandardSettings{
			Slug:  values[i].Slug,
			Unit:  values[i].Unit,
			Value: formatRawSetting(values[i].Value, values[i].Unit),
		})
	}

	err := updateSettings(data, update, ctx)

	return err
}
