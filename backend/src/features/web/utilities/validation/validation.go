package validation

import (
	"log/slog"

	"motiva-erp/backend/src/features/data/repository"

	"github.com/go-playground/validator/v10"
)

var (
	validate  *validator.Validate       = nil
	registers map[string]validator.Func = map[string]validator.Func{
		repository.ValKeySecurePassword: securePasswordValidation,
	}
)

/**
 * Initial function to set validator instance, set custom
 * validators helper values & register custom validator functions
 */
func Init() error {
	if validate != nil {
		return nil
	}

	setAllowedChars()

	validate = validator.New()

	for key, function := range registers {
		if err := validate.RegisterValidation(key, function); err != nil {
			slog.Error("Error on validator function register",
				"event", "validation.InitRegisterValidation",
				"key", key,
			)

			return err
		}
	}

	return nil
}
