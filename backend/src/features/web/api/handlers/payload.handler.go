package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/utilities/i18n"
	"motiva-erp/backend/src/features/web/utilities/validation"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"
)

/**
 * Reads & validates the request payload. When it isn't valid the
 * error response is already written & ok is false, so the handler
 * only has to return.
 */
func readPayload[T any](response http.ResponseWriter, request *http.Request) (payload *T, ok bool) {
	lang := request.Header.Get(repository.HeadAcceptLanguage)
	payload, details, err := validation.RequestPayloadValidation[T](response, request)

	if err == nil {
		return payload, true
	}

	if details != nil {
		preview := &controller.EpPreview[struct{}]{
			Error: &controller.EpError{
				Message: i18n.Translate(lang, repository.ValI18nKeyFailFieldsValidation, nil),
				Details: []*controller.ErrorDetails{},
			},
		}

		for _, detail := range *details {
			preview.Error.Details = append(preview.Error.Details, &controller.ErrorDetails{
				Field:  detail.Field,
				Detail: i18n.Translate(lang, repository.I18nTagsKeys[detail.Tag], map[string]any{"Param": detail.Param}),
			})
		}

		response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(preview)

		return nil, false
	}

	var maxBytesErr *http.MaxBytesError

	switch {
	case errors.Is(err, repository.ValErrInvalidDataType):
		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
	case errors.As(err, &maxBytesErr):
		http.Error(response, repository.HttpContentTooLarge, http.StatusRequestEntityTooLarge)
	default:
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
	}

	return nil, false
}

/**
 * Writes a 400 response with a translated business error message
 */
func writeBadRequest(response http.ResponseWriter, request *http.Request, key models.I18nKey) {
	lang := request.Header.Get(repository.HeadAcceptLanguage)
	preview := &controller.EpPreview[struct{}]{
		Error: &controller.EpError{
			Message: i18n.Translate(lang, key, nil),
		},
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(response).Encode(preview)
}
