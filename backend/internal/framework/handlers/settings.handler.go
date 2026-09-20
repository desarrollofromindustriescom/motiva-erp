package handlers

import (
	"encoding/json"
	"motiva-erp/backend/internal/features/settings"
	"motiva-erp/backend/internal/framework/messages"
	"motiva-erp/backend/internal/models"
	"net/http"
)

func GetSettings(response http.ResponseWriter, request *http.Request) {
	responseDTO := &models.ApiResponseDTO[struct {
		Settings []models.SettingsItemDTO `json:"Settings"`
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
			Title: list[i].Title,
			Slug:  list[i].Slug,
			Unit:  list[i].Unit,
			Value: settings.FormatValue(
				list[i].Value,
				list[i].Unit,
			),
		}

		elements = append(elements, setting)
	}

	responseDTO.Success = true
	responseDTO.Data = &struct {
		Settings []models.SettingsItemDTO `json:"Settings"`
	}{
		Settings: elements,
	}

	json.NewEncoder(response).Encode(responseDTO)
}
