package validation

import (
	"math"

	"github.com/go-playground/validator/v10"
)

/**
 * Checks the value has at most the given decimals
 */
func hasMaxDecimals(value float64, decimals int) bool {
	scale := math.Pow10(decimals)
	scaled := value * scale

	return math.Abs(scaled-math.Round(scaled)) < 1e-6
}

/**
 * Percentage between 0.1 & 1000 with at most 3 decimals
 */
func percentageValidation(level validator.FieldLevel) bool {
	value := level.Field().Float()

	return value >= 0.1 && value <= 1000 && hasMaxDecimals(value, 3)
}

/**
 * Monetary amount between 0.1 & 100000 with at most 2 decimals
 */
func monetaryValidation(level validator.FieldLevel) bool {
	value := level.Field().Float()

	return value >= 0.1 && value <= 100000 && hasMaxDecimals(value, 2)
}
