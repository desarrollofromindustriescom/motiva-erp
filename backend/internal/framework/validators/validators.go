package validators

import (
	"strconv"
	"strings"
)

func ValidatePercentage(value float64) bool {
	parts := strings.Split(strconv.FormatFloat(value, 'f', -1, 32), ".")
	err := value < 0.1 || value > 100 || (len(parts) == 2 && len(parts[1]) > 3)

	return !err
}

func ValidateMonetary(value float64) bool {
	parts := strings.Split(strconv.FormatFloat(value, 'f', -1, 32), ".")
	err := value < 0.1 || value > 100000 || (len(parts) == 2 && len(parts[1]) > 2)

	return !err
}

func ValidateWeeks(value int) bool {
	err := value < 1 || value > 100000
	return !err
}
