package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"motiva-erp/backend/src/features/data/modules/cashbalance"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
)

/**
 * Get the general program cash balance
 */
func GetCashBalance(response http.ResponseWriter, request *http.Request) {
	balance, err := cashbalance.GetGeneralBalance(request.Context())

	if err != nil {
		if errors.Is(err, repository.CbErrNotFound) {
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
			return
		}

		slog.Error("Error getting general cash balance",
			"event", "handlers.GetCashBalance.GetGeneralBalance",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview := &controller.EpPreview[controller.CashBalancePreview]{
		Success: true,
		Data:    balance,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}
