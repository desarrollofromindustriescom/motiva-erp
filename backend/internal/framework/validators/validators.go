package validators

import (
	"strconv"
	"strings"
)

func ValidatePercentage(value float64) bool {
	parts := strings.Split(strconv.FormatFloat(value, 'f', -1, 32), ".")
	err := value < 0.1 || value > 1000 || (len(parts) == 2 && len(parts[1]) > 3)

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

func ValidateRate(investor []float64, general []float64, length int) (int, bool) {
	if len(investor) != length || len(general) != length {
		return -1, false
	}

	var (
		investorValid bool
		generalValid  bool
	)

	for i := range length {
		investorValid = ValidatePercentage(investor[i])
		generalValid = ValidatePercentage(general[i])

		if !investorValid || !generalValid || investor[i] > general[i] {
			return i, false
		}
	}

	return -1, true
}
