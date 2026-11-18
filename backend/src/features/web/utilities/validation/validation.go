package validation

import (
	"log/slog"
	"mime"
	"net/http"

	"motiva-erp/backend/src/features/data/repository"

	"github.com/go-playground/validator/v10"
)

var (
	validate  *validator.Validate       = nil
	registers map[string]validator.Func = map[string]validator.Func{
		repository.ValKeySecurePassword: securePasswordValidation,
		repository.ValKeyPercentage:     percentageValidation,
		repository.ValKeyMonetary:       monetaryValidation,
		repository.ValKeyCashMonetary:   cashMonetaryValidation,
		repository.ValKeyPhone:          phoneValidation,
		repository.ValKeyCURP:           curpValidation,
		repository.ValKeyClabe:          clabeValidation,
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

/**
 * Function to validate request body type
 * taking content type header as source
 */
func contentTypeValidation(request *http.Request, expected string) error {
	media, _, err := mime.ParseMediaType(request.Header.Get(repository.HeadContentType))

	if err != nil {
		slog.Error("Error on content type validation",
			"event", "validation.ContentTypeValidation.ParseMediaType",
			"header", request.Header.Get("Content-Type"),
		)

		return err
	}

	if media != expected {
		slog.Error("Content type isn't the expected",
			"event", "validation.ContentTypeValidation.contentTypeMismatch",
			"media", media,
			"expected", expected,
		)

		return repository.ValErrContentTypeMismatch
	}

	return nil
}
