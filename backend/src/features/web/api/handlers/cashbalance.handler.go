package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"motiva-erp/backend/src/features/data/modules/cashbalance"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/google/uuid"
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

/**
 * Writes the updated balance as endpoint response
 */
func writeCashBalance(response http.ResponseWriter, balance *controller.CashBalancePreview) {
	preview := &controller.EpPreview[controller.CashBalancePreview]{
		Success: true,
		Data:    balance,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Generic handler for deposit & withdrawal movements
 */
func createCashBalanceMovement(response http.ResponseWriter, request *http.Request, movement string) {
	payload, ok := readPayload[controller.CashBalanceMovementPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	balance, err := cashbalance.CreateMovement(ctx, currentSession.User, nil, movement, payload.Amount)

	if err != nil {
		switch {
		case errors.Is(err, repository.CbErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.CbErrInsufficient):
			writeBadRequest(response, request, repository.CbI18nKeyInsufficient)
		case errors.Is(err, repository.CbErrLimit):
			writeBadRequest(response, request, repository.CbI18nKeyLimit)
		default:
			slog.Error("Error creating cash balance movement",
				"event", "handlers.createCashBalanceMovement.CreateMovement",
				"movement", movement,
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		}

		return
	}

	writeCashBalance(response, balance)
}

/**
 *
 */
func DepositCashBalance(response http.ResponseWriter, request *http.Request) {
	createCashBalanceMovement(response, request, repository.CbMovementDeposit)
}

/**
 *
 */
func WithdrawCashBalance(response http.ResponseWriter, request *http.Request) {
	createCashBalanceMovement(response, request, repository.CbMovementWithdrawal)
}

/**
 * Paginated movements of the general cash balance. Uses QUERY
 * method: it reads data like GET but receives the page in the body
 */
func QueryCashMovements(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.MovementsQueryPayload](response, request)

	if !ok {
		return
	}

	movements, err := cashbalance.GetMovements(request.Context(), nil, payload.Page, payload.Size)

	if err != nil {
		slog.Error("Error getting cash balance movements",
			"event", "handlers.QueryCashMovements.GetMovements",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview := &controller.EpPreview[controller.MovementsPagePreview]{
		Success: true,
		Data:    movements,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Cash balance of an investor (header of its investments dialog)
 */
func GetInvestorBalance(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	balance, err := cashbalance.GetInvestorBalance(ctx, id, visibleProfiles(currentSession.User))

	if err != nil {
		switch {
		case errors.Is(err, repository.UsrErrNotFound), errors.Is(err, repository.CbErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.CbErrNotInvestor):
			writeBadRequest(response, request, repository.CbI18nKeyNotInvestor)
		default:
			slog.Error("Error getting investor cash balance",
				"event", "handlers.GetInvestorBalance.GetInvestorBalance",
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		}

		return
	}

	preview := &controller.EpPreview[controller.InvestorBalancePreview]{
		Success: true,
		Data:    balance,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Generic handler for deposit & withdrawal movements on the balance of an investor
 */
func createInvestorMovement(response http.ResponseWriter, request *http.Request, movement string) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payload, ok := readPayload[controller.CashBalanceMovementPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	balance, err := cashbalance.CreateInvestorMovement(ctx, currentSession.User, id, visibleProfiles(currentSession.User), movement, payload.Amount)

	if err != nil {
		switch {
		case errors.Is(err, repository.UsrErrNotFound), errors.Is(err, repository.CbErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.CbErrNotInvestor):
			writeBadRequest(response, request, repository.CbI18nKeyNotInvestor)
		case errors.Is(err, repository.CbErrInsufficient):
			writeBadRequest(response, request, repository.CbI18nKeyInsufficient)
		case errors.Is(err, repository.CbErrLimit):
			writeBadRequest(response, request, repository.CbI18nKeyLimit)
		default:
			slog.Error("Error creating investor cash balance movement",
				"event", "handlers.createInvestorMovement.CreateInvestorMovement",
				"movement", movement,
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		}

		return
	}

	preview := &controller.EpPreview[controller.InvestorBalancePreview]{
		Success: true,
		Data:    balance,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Deposit on the balance of an investor
 */
func DepositInvestorBalance(response http.ResponseWriter, request *http.Request) {
	createInvestorMovement(response, request, repository.CbMovementDeposit)
}

/**
 * Withdrawal from the balance of an investor
 */
func WithdrawInvestorBalance(response http.ResponseWriter, request *http.Request) {
	createInvestorMovement(response, request, repository.CbMovementWithdrawal)
}

/**
 * Paginated movements of the balance of an investor, same QUERY method
 * & payload as the movements of the general cash balance
 */
func QueryInvestorMovements(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payload, ok := readPayload[controller.MovementsQueryPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	movements, err := cashbalance.GetInvestorMovements(ctx, id, visibleProfiles(currentSession.User), payload.Page, payload.Size)

	if err != nil {
		switch {
		case errors.Is(err, repository.UsrErrNotFound), errors.Is(err, repository.CbErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.CbErrNotInvestor):
			writeBadRequest(response, request, repository.CbI18nKeyNotInvestor)
		default:
			slog.Error("Error getting investor cash balance movements",
				"event", "handlers.QueryInvestorMovements.GetInvestorMovements",
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		}

		return
	}

	preview := &controller.EpPreview[controller.MovementsPagePreview]{
		Success: true,
		Data:    movements,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}
