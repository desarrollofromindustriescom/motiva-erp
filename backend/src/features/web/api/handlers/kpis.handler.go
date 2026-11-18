package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"motiva-erp/backend/src/features/data/modules/kpis"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
)

/**
 * Kpis of the dashboard: the values stored by the api (money lent, what is waiting to be paid, investors,
 * borrowers) & the loans made on the last weeks
 */
func GetKpis(response http.ResponseWriter, request *http.Request) {
	data, err := kpis.Get(request.Context())

	if err != nil {
		slog.Error("Error getting the kpis",
			"event", "handlers.GetKpis.Get",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview := &controller.EpPreview[controller.KpisPreview]{
		Success: true,
		Data:    data,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}
