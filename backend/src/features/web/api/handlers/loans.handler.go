package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

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
		case errors.Is(err, repository.LnErrNotActive):
			writeBadRequest(response, request, repository.LnI18nKeyNotActive)
		case errors.Is(err, repository.LnErrPaymentAmount):
			writeBadRequest(response, request, repository.LnI18nKeyPaymentAmount)
		case errors.Is(err, repository.LnErrPaymentNotNext):
			writeBadRequest(response, request, repository.LnI18nKeyPaymentNotNext)
		case errors.Is(err, repository.LnErrLoanExceeds):
			writeBadRequest(response, request, repository.LnI18nKeyLoanExceeds)
		case errors.Is(err, repository.LnErrPaymentExceeds):
			writeBadRequest(response, request, repository.LnI18nKeyPaymentExceeds)
		case errors.Is(err, repository.LnErrVisitNotCurrent):
			writeBadRequest(response, request, repository.LnI18nKeyVisitNotCurrent)
		case errors.Is(err, repository.LnErrExtraSetting):
			writeBadRequest(response, request, repository.LnI18nKeyExtraSetting)
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

/**
 * Changes a pending loan & continues it: it stays pending or, with funds, it is approved
 */
func UpdateLoan(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payload, ok := readPayload[controller.NewLoanPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	loan, err := loans.Update(ctx, currentSession.User, id, payload)

	writeLoanResult(response, request, "handlers.UpdateLoan.Update", http.StatusOK, loan, err)
}

/**
 * Payments of one loan with their state (payments dialog)
 */
func GetLoanPayments(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payments, err := loans.GetPayments(request.Context(), id)

	writeLoanResult(response, request, "handlers.GetLoanPayments.GetPayments", http.StatusOK, &payments, err)
}

/**
 * Pays part or all of the debt of the next payment of a loan
 */
func PayLoanPayment(response http.ResponseWriter, request *http.Request) {
	loanID, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	paymentID, err := uuid.Parse(request.PathValue("paymentId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payload, ok := readPayload[controller.PayLoanPaymentPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	payments, err := loans.PayPayment(ctx, currentSession.User, loanID, paymentID, payload.Amount)

	writeLoanResult(response, request, "handlers.PayLoanPayment.PayPayment", http.StatusCreated, &payments, err)
}

/**
 * Payments made to one payment of a loan (paginated, same QUERY method as the other lists)
 */
func QueryLoanPaymentDeposits(response http.ResponseWriter, request *http.Request) {
	loanID, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	paymentID, err := uuid.Parse(request.PathValue("paymentId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payload, ok := readPayload[controller.LoanDepositsQueryPayload](response, request)

	if !ok {
		return
	}

	deposits, err := loans.GetPaymentDeposits(request.Context(), loanID, paymentID, payload.Page, payload.Size)

	writeLoanResult(response, request, "handlers.QueryLoanPaymentDeposits.GetPaymentDeposits", http.StatusOK, deposits, err)
}

/**
 * Registers a visit to a payment of a loan
 */
func AddLoanPaymentVisit(response http.ResponseWriter, request *http.Request) {
	loanID, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	paymentID, err := uuid.Parse(request.PathValue("paymentId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payments, err := loans.AddVisit(request.Context(), loanID, paymentID)

	writeLoanResult(response, request, "handlers.AddLoanPaymentVisit.AddVisit", http.StatusCreated, &payments, err)
}

/**
 * Original amount, mora & visits of one payment of a loan
 */
func GetLoanPaymentBreakdown(response http.ResponseWriter, request *http.Request) {
	loanID, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	paymentID, err := uuid.Parse(request.PathValue("paymentId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	breakdown, err := loans.GetBreakdown(request.Context(), loanID, paymentID)

	writeLoanResult(response, request, "handlers.GetLoanPaymentBreakdown.GetBreakdown", http.StatusOK, breakdown, err)
}

/**
 * Pays any part of what a loan owes
 */
func PayLoan(response http.ResponseWriter, request *http.Request) {
	loanID, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payload, ok := readPayload[controller.PayLoanPaymentPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	payments, err := loans.PayLoan(ctx, currentSession.User, loanID, payload.Amount)

	writeLoanResult(response, request, "handlers.PayLoan.PayLoan", http.StatusCreated, &payments, err)
}

/**
 * Calendar of payments: the active loans grouped by the weekday of their current payment
 */
func GetLoansCalendar(response http.ResponseWriter, request *http.Request) {
	days, err := loans.GetCalendar(request.Context())

	writeLoanResult(response, request, "handlers.GetLoansCalendar.GetCalendar", http.StatusOK, &days, err)
}

/**
 * Calendar of payments as an Excel file (download)
 */
func GetLoansCalendarExcel(response http.ResponseWriter, request *http.Request) {
	file, err := loans.BuildCalendarExcel(request.Context())

	if err != nil {
		writeLoanResult[struct{}](response, request, "handlers.GetLoansCalendarExcel.BuildCalendarExcel", http.StatusOK, nil, err)
		return
	}

	name := "calendario-de-pagos-" + time.Now().Format("2006-01-02") + ".xlsx"

	response.Header().Set(repository.HeadContentType, repository.LnExcelFileMime)
	response.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	response.Header().Set("X-Content-Type-Options", "nosniff")
	response.Header().Set("Cache-Control", "private, no-store")
	response.WriteHeader(http.StatusOK)
	response.Write(file)
}

/**
 * Loans of the table as an Excel file (download), with the same filters & order
 */
func QueryLoansExcel(response http.ResponseWriter, request *http.Request) {
	filters, ok := readPayload[controller.LoansFiltersPayload](response, request)

	if !ok {
		return
	}

	file, err := loans.BuildLoansExcel(request.Context(), filters)

	if err != nil {
		writeLoanResult[struct{}](response, request, "handlers.QueryLoansExcel.BuildLoansExcel", http.StatusOK, nil, err)
		return
	}

	name := "prestamos-" + time.Now().Format("2006-01-02") + ".xlsx"

	response.Header().Set(repository.HeadContentType, repository.LnExcelFileMime)
	response.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	response.Header().Set("X-Content-Type-Options", "nosniff")
	response.Header().Set("Cache-Control", "private, no-store")
	response.WriteHeader(http.StatusOK)
	response.Write(file)
}
