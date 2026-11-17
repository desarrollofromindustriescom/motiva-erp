package validation

import (
	"regexp"

	"github.com/go-playground/validator/v10"
)

var (
	phoneRegex = regexp.MustCompile(`^[0-9]{10}$`)
	curpRegex  = regexp.MustCompile(`^(?i)[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$`)
	clabeRegex = regexp.MustCompile(`^[0-9]{18}$`)
)

/**
 * Mexican phone number: exactly 10 digits
 */
func phoneValidation(level validator.FieldLevel) bool {
	return phoneRegex.MatchString(level.Field().String())
}

/**
 * CURP: 18 characters with the official structure
 */
func curpValidation(level validator.FieldLevel) bool {
	return curpRegex.MatchString(level.Field().String())
}

/**
 * CLABE: 18 digits
 */
func clabeValidation(level validator.FieldLevel) bool {
	return clabeRegex.MatchString(level.Field().String())
}
