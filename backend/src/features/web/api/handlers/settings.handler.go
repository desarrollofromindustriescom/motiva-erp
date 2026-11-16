package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"slices"

	"motiva-erp/backend/src/features/data/modules/settings"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/utilities/i18n"
	"motiva-erp/backend/src/features/web/utilities/validation"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"
)

/**
 * Settings are only available for superadmin & administrator
 */
func settingsAllowed(response http.ResponseWriter, request *http.Request) bool {
	currentSession := request.Context().Value("session").(*models.Session)

	if slices.Contains(repository.StgAllowedProfiles, currentSession.User.Profile) {
		return true
	}

	http.Error(response, repository.HttpForbidden, http.StatusForbidden)

	return false
}

/**
 * Writes the list of settings as endpoint response
 */
func writeSettings(response http.ResponseWriter, list []*controller.SettingPreview) {
	preview := &controller.EpPreview[[]*controller.SettingPreview]{
		Success: true,
		Data:    &list,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Get all active settings (superadmin & administrator only)
 */
func GetSettings(response http.ResponseWriter, request *http.Request) {
	if !settingsAllowed(response, request) {
		return
	}

	list, err := settings.GetActiveSettings(request.Context())

	if err != nil {
		slog.Error("Error getting active settings",
			"event", "handlers.GetSettings.GetActiveSettings",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	writeSettings(response, list)
}

/**
 * Generic handler to update a group of settings: validates
 * the payload, runs the update & answers with the saved values
 */
func updateSettings[T any](
	response http.ResponseWriter,
	request *http.Request,
	event string,
	update func(payload *T) ([]*controller.SettingPreview, error),
) {
	if !settingsAllowed(response, request) {
		return
	}

	lang := request.Header.Get(repository.HeadAcceptLanguage)
	payload, details, err := validation.RequestPayloadValidation[T](response, request)

	if err != nil {
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

	list, err := update(payload)

	if err != nil {
		if errors.Is(err, repository.StgErrInvestorAboveGeneral) {
			preview := &controller.EpPreview[struct{}]{
				Error: &controller.EpError{
					Message: i18n.Translate(lang, repository.StgI18nKeyInvestorAboveGeneral, nil),
				},
			}

			response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
			response.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(response).Encode(preview)
			return
		}

		slog.Error("Error updating settings",
			"event", event,
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	writeSettings(response, list)
}

/**
 *
 */
func UpdateExtraSettings(response http.ResponseWriter, request *http.Request) {
	updateSettings(response, request, "handlers.UpdateExtraSettings.UpdateExtras",
		func(payload *controller.ExtrasSettingsPayload) ([]*controller.SettingPreview, error) {
			return settings.UpdateExtras(request.Context(), payload)
		},
	)
}

/**
 *
 */
func UpdateAgreementSettings(response http.ResponseWriter, request *http.Request) {
	updateSettings(response, request, "handlers.UpdateAgreementSettings.UpdateAgreements",
		func(payload *controller.AgreementsSettingsPayload) ([]*controller.SettingPreview, error) {
			return settings.UpdateAgreements(request.Context(), payload)
		},
	)
}

/**
 *
 */
func UpdateMonthlySettings(response http.ResponseWriter, request *http.Request) {
	updateSettings(response, request, "handlers.UpdateMonthlySettings.UpdateRates",
		func(payload *controller.MonthlySettingsPayload) ([]*controller.SettingPreview, error) {
			return settings.UpdateRates(request.Context(), repository.StgPrefixMonthly, payload.Investor, payload.General)
		},
	)
}

/**
 *
 */
func UpdateWeeklySettings(response http.ResponseWriter, request *http.Request) {
	updateSettings(response, request, "handlers.UpdateWeeklySettings.UpdateRates",
		func(payload *controller.WeeklySettingsPayload) ([]*controller.SettingPreview, error) {
			return settings.UpdateRates(request.Context(), repository.StgPrefixWeekly, payload.Investor, payload.General)
		},
	)
}
