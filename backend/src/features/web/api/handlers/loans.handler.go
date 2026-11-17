package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"motiva-erp/backend/src/features/data/modules/loans"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/google/uuid"
)

/**
 * Writes the response of a loan operation, translating the business errors
 */
func writeLoanResult[T any](response http.ResponseWriter, request *http.Request, event string, status int, data *T, err error) {
	if err != nil {
		switch {
		case errors.Is(err, repository.CbErrNotFound), errors.Is(err, repository.LnErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.LnErrBorrowerInvalid):
			writeBadRequest(response, request, repository.LnI18nKeyBorrowerInvalid)
		case errors.Is(err, repository.LnErrPaymentsInvalid):
			writeBadRequest(response, request, repository.LnI18nKeyPaymentsInvalid)
		case errors.Is(err, repository.LnErrRateNotFound):
			writeBadRequest(response, request, repository.LnI18nKeyRateNotFound)
		case errors.Is(err, repository.LnErrAmountTooLarge):
			writeBadRequest(response, request, repository.LnI18nKeyAmountTooLarge)
		case errors.Is(err, repository.LnErrFundsMismatch):
			writeBadRequest(response, request, repository.LnI18nKeyFundsMismatch)
		case errors.Is(err, repository.LnErrFundsInsufficent):
			writeBadRequest(response, request, repository.LnI18nKeyFundsInsufficent)
		case errors.Is(err, repository.LnErrNotPending):
			writeBadRequest(response, request, repository.LnI18nKeyNotPending)
		default:
			slog.Error("Error on loans operation", "event", event, "error", err)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		}

		return
	}

	preview := &controller.EpPreview[T]{Success: true, Data: data}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(status)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Interest & funds available for some loan terms
 */
func QueryLoanFunds(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.LoanFundsQueryPayload](response, request)

	if !ok {
		return
	}

	funds, err := loans.GetFunds(request.Context(), payload.Type, payload.NoPayments)

	writeLoanResult(response, request, "handlers.QueryLoanFunds.GetFunds", http.StatusOK, funds, err)
}

/**
 * New loan: pending without funds, approved (active) with them
 */
func CreateLoan(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.NewLoanPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	loan, err := loans.Create(ctx, currentSession.User, payload)

	writeLoanResult(response, request, "handlers.CreateLoan.Create", http.StatusCreated, loan, err)
}

/**
 * Approves a pending loan with the funds chosen for it
 */
func ApproveLoan(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payload, ok := readPayload[controller.ApproveLoanPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	loan, err := loans.Approve(ctx, currentSession.User, id, payload.Funds)

	writeLoanResult(response, request, "handlers.ApproveLoan.Approve", http.StatusOK, loan, err)
}

/**
 * Paginated loans of the table with the combined filters
 */
func QueryLoans(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.LoansQueryPayload](response, request)

	if !ok {
		return
	}

	page, err := loans.GetPage(request.Context(), payload)

	writeLoanResult(response, request, "handlers.QueryLoans.GetPage", http.StatusOK, page, err)
}

/**
 * Every data of one loan (detail dialog)
 */
func GetLoan(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	loan, err := loans.GetByID(request.Context(), id)

	writeLoanResult(response, request, "handlers.GetLoan.GetByID", http.StatusOK, loan, err)
}
