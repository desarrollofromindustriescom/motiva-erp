package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/modules/authentication"
	"motiva-erp/backend/src/features/data/modules/session"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/utilities/i18n"
	"motiva-erp/backend/src/features/web/utilities/validation"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"
)

/**
 *
 */
func ChangePassword(response http.ResponseWriter, request *http.Request) {
	lang := request.Header.Get(repository.HeadAcceptLanguage)
	preview := &controller.EpPreview[struct{}]{}
	payload, details, err := validation.RequestPayloadValidation[controller.ChangePasswordPayload](response, request)

	if err != nil {
		slog.Error("Error on request payload validation",
			"event", "handlers.ChangePassword.RequestPayloadValidation",
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

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		slog.Error("Error starting transaction",
			"event", "handlers.ChangePassword.Begin",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	defer tx.Rollback(ctx)

	if err = authentication.UpdatePassword(ctx, tx, currentSession, payload); err != nil {
		switch {
		case errors.Is(err, repository.AuthErrPasswordMismatch):
			preview.Error = &controller.EpError{
				Message: i18n.Translate(lang, repository.AuthI18nKeyCurrentPasswordFailed, nil),
			}
		case errors.Is(err, repository.AuthErrNewPasswordSameAsCurrent):
			preview.Error = &controller.EpError{
				Message: i18n.Translate(lang, repository.AuthI18nKeyNewPasswordSameAsCurrent, nil),
			}
		case errors.Is(err, repository.AuthErrNewPasswordsMismatch):
			preview.Error = &controller.EpError{
				Message: i18n.Translate(lang, repository.AuthI18nKeyNewPasswordsFailed, nil),
			}
		default:
			slog.Error("Error updating user password",
				"event", "handlers.ChangePassword.UpdatePassword",
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
			return
		}

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(preview)
		return
	}

	if err = session.RevokeOtherSessions(ctx, tx, currentSession); err != nil {
		slog.Error("Error revoking user sessions",
			"event", "handlers.ChangePassword.RevokeOtherSessions",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(ctx); err != nil {
		slog.Error("Error committing transaction",
			"event", "handlers.ChangePassword.Commit",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview.Success = true

	response.WriteHeader(http.StatusOK)
	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	json.NewEncoder(response).Encode(preview)
}
