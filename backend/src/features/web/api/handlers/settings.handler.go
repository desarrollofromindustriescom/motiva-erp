package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"motiva-erp/backend/src/features/data/modules/settings"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
)

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
 * Get all active settings
 */
func GetSettings(response http.ResponseWriter, request *http.Request) {
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
	payload, ok := readPayload[T](response, request)

	if !ok {
		return
	}

	list, err := update(payload)

	if err != nil {
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
func UpdateBiweeklySettings(response http.ResponseWriter, request *http.Request) {
	updateSettings(response, request, "handlers.UpdateBiweeklySettings.UpdateRates",
		func(payload *controller.BiweeklySettingsPayload) ([]*controller.SettingPreview, error) {
			return settings.UpdateRates(request.Context(), repository.StgPrefixBiweekly, payload.Investor, payload.General)
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
