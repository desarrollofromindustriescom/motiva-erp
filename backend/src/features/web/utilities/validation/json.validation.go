package validation

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"reflect"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/go-playground/validator/v10"
)

/**
 * Functio to validate data in struct with validation
 * tags & params, then collect errors to return
 * information to frontend
 */
func FieldsTagsValidation[T any](payload *T) (*[]models.ValidationErrorDetail, error) {
	customType := reflect.TypeFor[T]()

	if customType.Kind() != reflect.Struct {
		slog.Error("Data type isn't an valid struct",
			"event", "validation.FieldsTagsValidation.Kind",
			"king", customType.Kind(),
		)

		return nil, repository.ValErrInvalidDataType
	}

	if err := validate.Struct(payload); err != nil {
		var valErrors *[]models.ValidationErrorDetail = nil

		slog.Error("Error on payload fields validation",
			"event", "validation.RequestJsonValidation.Struct",
		)

		if details, ok := err.(validator.ValidationErrors); ok {
			valErrors = &[]models.ValidationErrorDetail{}

			for _, field := range details {
				*valErrors = append(*valErrors, models.ValidationErrorDetail{
					Field: field.Field(),
					Tag:   field.Tag(),
					Param: field.Param(),
				})
			}
		}

		return valErrors, err
	}

	return nil, nil
}

/**
 * Function to validate endpoint request payload,
 * seting value for max size & decoding it into object instance
 */
func requestJsonDecode[T any](response http.ResponseWriter, request *http.Request) (*T, error) {
	customType := reflect.TypeFor[T]()

	if customType.Kind() != reflect.Struct {
		slog.Error("Data type isn't an valid struct",
			"event", "validation.RequestJsonDecode.Kind",
			"king", customType.Kind(),
		)

		return nil, repository.ValErrInvalidDataType
	}

	var payload *T

	request.Body = http.MaxBytesReader(response, request.Body, repository.ValJsonMaxSize)

	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&payload); err != nil {
		slog.Error("Error decoding request payload",
			"event", "validation.RequestJsonValidation.Decode",
		)

		return nil, repository.ValErrPayloadDecode
	}

	return payload, nil
}

/**
 * Broker function to validate handler request
 * calling three helper functions
 */
func RequestPayloadValidation[T any](response http.ResponseWriter, request *http.Request) (*T, *[]models.ValidationErrorDetail, error) {
	if err := contentTypeValidation(request, repository.ValMimeJson); err != nil {
		slog.Error("Error verifying request content type",
			"event", "validation.RequestPayloadValidation.contentTypeValidation",
		)

		return nil, nil, err
	}

	payload, err := requestJsonDecode[T](response, request)

	if err != nil {
		slog.Error("Error decoding user paylaod",
			"event", "validation.RequestPayloadValidation.requestJsonDecode",
		)

		return nil, nil, err
	}

	if details, err := FieldsTagsValidation(payload); err != nil {
		slog.Error("Error decoding user paylaod",
			"event", "validation.RequestPayloadValidation.FieldsTagsValidation",
		)

		return nil, details, err
	}

	return payload, nil, nil
}
