package handlers

import (
	"encoding/json"
	"motiva-erp/backend/internal/features/settings"
	"motiva-erp/backend/internal/framework/messages"
	"motiva-erp/backend/internal/framework/validators"
	"motiva-erp/backend/internal/models"
	"net/http"
)

func GetSettings(response http.ResponseWriter, request *http.Request) {
	responseDTO := &models.ApiResponseDTO[struct {
		Settings []models.SettingsItemDTO `json:"settings"`
	}]{
		Success: false,
	}

	list, err := settings.GetAllSettings(request.Context())

	if err != nil {
		responseDTO.Error = &models.ErrorDetailDTO{Message: messages.RequestComleteSettingsError}

		response.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	elements := []models.SettingsItemDTO{}

	for i := 0; i < len(list); i++ {
		setting := models.SettingsItemDTO{
			Slug: list[i].Slug,
			Unit: list[i].Unit,
			Value: settings.FormatValue(
				list[i].Value,
				list[i].Unit,
			),
		}

		elements = append(elements, setting)
	}

	responseDTO.Success = true
	responseDTO.Data = &struct {
		Settings []models.SettingsItemDTO `json:"settings"`
	}{
		Settings: elements,
	}

	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(responseDTO)
}

func SetExtraValues(response http.ResponseWriter, request *http.Request) {
	extraValues := &models.ExtraValuesRequest{}
	responseDTO := &models.ApiResponseDTO[struct{}]{Success: false}

	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&extraValues); err != nil {
		responseDTO.Error = &models.ErrorDetailDTO{Message: messages.RequestValidationError}

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	errMora := !validators.ValidatePercentage(extraValues.Mora)
	errVisit := !validators.ValidateMonetary(extraValues.Visit)

	if errMora || errVisit {
		details := []models.ErrorDetailsDTO{}

		if errMora {
			details = append(details, models.ErrorDetailsDTO{
				Field:   "mora",
				Current: extraValues.Mora,
			})
		}

		if errVisit {
			details = append(details, models.ErrorDetailsDTO{
				Field:   "visit",
				Current: extraValues.Visit,
			})
		}

		responseDTO.Error = &models.ErrorDetailDTO{
			Message: messages.DataValidationError,
			Details: details,
		}

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	values := []models.StandardSettingsRaw{
		{
			Slug:  "mora",
			Value: extraValues.Mora,
			Unit:  "percentage",
		},
		{
			Slug:  "visit",
			Value: extraValues.Visit,
			Unit:  "monetary",
		},
	}

	err := settings.SetNewSettings(values, "extra", request.Context())

	if err != nil {
		responseDTO.Error = &models.ErrorDetailDTO{Message: messages.UpdateSettingsError}

		response.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	responseDTO.Success = true

	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(responseDTO)
}
