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
	data := []models.StandardSettings{}

	switch update {
	case "extra":
		if len(values) != 2 {
			return fmt.Errorf("Error invalid keys length")
		}
	case "agreement":
		if len(values) != 3 {
			return fmt.Errorf("Error invalid keys length")
		}

	default:
		return fmt.Errorf("Invalid update option")
	}

	for i := 0; i < len(values); i++ {
		data = append(data, models.StandardSettings{
			Slug:  values[i].Slug,
			Unit:  values[i].Unit,
			Value: formatRawSetting(values[i].Value, values[i].Unit),
		})
	}

	err := updateSettings(data, update, ctx)

	return err
}
