package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"motiva-erp/backend/src/features/data/modules/authentication"
	"motiva-erp/backend/src/features/data/modules/session"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/utilities/i18n"
	"motiva-erp/backend/src/features/web/utilities/validation"
	"motiva-erp/backend/src/interfaces/controller"

	"github.com/jackc/pgx/v5"
)

/**
 *
 */
func Login(response http.ResponseWriter, request *http.Request) {
	lang := request.Header.Get(repository.HeadAcceptLanguage)
	preview := &controller.EpPreview[controller.LoginPreview]{}
	payload, details, err := validation.RequestPayloadValidation[controller.LoginPayload](response, request)

	if err != nil {
		slog.Error("Error on request payload validation",
			"event", "handlers.Login.RequestPayloadValidation",
			"error", err,
		)

		if details != nil {
			preview.Error = &controller.EpError{
				Message: i18n.Translate(lang, repository.ValI18nKeyFailFieldsValidation, nil),
				Details: []*controller.ErrorDetails{},
			}

			for _, detail := range *details {
				preview.Error.Details = append(preview.Error.Details, &controller.ErrorDetails{
					Field:  detail.Field,
					Detail: i18n.Translate(lang, repository.I18nTagsKeys[detail.Tag], map[string]any{"Param": detail.Param}),
				})
			}

			response.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(response).Encode(preview)
			return
		}

		var maxBytesErr *http.MaxBytesError

		if errors.Is(err, repository.ValErrInvalidDataType) {
			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
			return
		}

		if errors.As(err, &maxBytesErr) {
			http.Error(response, repository.HttpContentTooLarge, http.StatusRequestEntityTooLarge)
			return
		}

		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	user, err := authentication.VerifyUserData(payload, request.Context())

	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) && !errors.Is(err, repository.AuthErrPasswordMismatch) {
			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
			return
		}

		preview.Error = &controller.EpError{
			Message: i18n.Translate(lang, repository.AuthI18nKeyUserNotFound, nil),
			Details: nil,
		}

		response.WriteHeader(http.StatusNotFound)
		json.NewEncoder(response).Encode(preview)
		return
	}

	session, err := session.CreateNewSession(user, request)

	if err != nil {
		preview.Error = &controller.EpError{
			Message: i18n.Translate(lang, repository.SsI18nKeyErrorOnSessionGeneration, nil),
		}

		response.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(response).Encode(preview)
		return
	}

	preview.Success = true
	preview.Data = &controller.LoginPreview{Token: session.Token}

	response.WriteHeader(http.StatusOK)
	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	json.NewEncoder(response).Encode(preview)
}
