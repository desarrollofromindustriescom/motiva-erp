package handlers

import (
	"net/http"

	"motiva-erp/backend/src/features/data/modules/loans"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/google/uuid"
)

/**
 * The borrower that makes the request. Every endpoint of its panel only reads its own
 * loans: the user comes from the session, never from the request.
 */
func currentBorrower(request *http.Request) *models.User {
	return request.Context().Value("session").(*models.Session).User
}

/**
 * Reads the id of the loan of the path & checks it belongs to the borrower. When it
 * doesn't (or it doesn't exist) a 404 is written, so a borrower can't know about other loans.
 */
func ownLoanID(response http.ResponseWriter, request *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return uuid.Nil, false
	}

	owned, err := loans.IsOwnedBy(request.Context(), id, currentBorrower(request).ID)

	if err != nil {
		writeLoanResult[struct{}](response, request, "handlers.ownLoanID.IsOwnedBy", http.StatusOK, nil, err)
		return uuid.Nil, false
	}

	if !owned {
		http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		return uuid.Nil, false
	}

	return id, true
}

/**
 * Panel of the borrower: debt, remaining payments, active loans & next payment
 */
func GetMySummary(response http.ResponseWriter, request *http.Request) {
	summary, err := loans.GetBorrowerSummary(request.Context(), currentBorrower(request).ID)

	writeLoanResult(response, request, "handlers.GetMySummary.GetBorrowerSummary", http.StatusOK, summary, err)
}

/**
 * Loans of the borrower (paginated), the same table of the loans module but only its own
 */
func QueryMyLoans(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.MyLoansQueryPayload](response, request)

	if !ok {
		return
	}

	query := &controller.LoansQueryPayload{
		Page: payload.Page,
		Size: payload.Size,
		LoansFiltersPayload: controller.LoansFiltersPayload{
			Order:     payload.Order,
			Borrowers: []string{currentBorrower(request).ID.String()},
		},
	}

	page, err := loans.GetPage(request.Context(), query)

	writeLoanResult(response, request, "handlers.QueryMyLoans.GetPage", http.StatusOK, page, err)
}

/**
 * Detail of one loan of the borrower. The cash balances & the investors that lent the
 * money are internal, so they are never part of what a borrower reads.
 */
func GetMyLoan(response http.ResponseWriter, request *http.Request) {
	id, ok := ownLoanID(response, request)

	if !ok {
		return
	}

	loan, err := loans.GetByID(request.Context(), id)

	if err == nil {
		loan.General = nil
		loan.Investors = []*controller.LoanLenderPreview{}
	}

	writeLoanResult(response, request, "handlers.GetMyLoan.GetByID", http.StatusOK, loan, err)
}

/**
 * Payments of one loan of the borrower
 */
func GetMyLoanPayments(response http.ResponseWriter, request *http.Request) {
	id, ok := ownLoanID(response, request)

	if !ok {
		return
	}

	payments, err := loans.GetPayments(request.Context(), id)

	writeLoanResult(response, request, "handlers.GetMyLoanPayments.GetPayments", http.StatusOK, &payments, err)
}

/**
 * Payments made to one payment of a loan of the borrower
 */
func QueryMyLoanPaymentDeposits(response http.ResponseWriter, request *http.Request) {
	id, ok := ownLoanID(response, request)

	if !ok {
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

	deposits, err := loans.GetPaymentDeposits(request.Context(), id, paymentID, payload.Page, payload.Size)

	writeLoanResult(response, request, "handlers.QueryMyLoanPaymentDeposits.GetPaymentDeposits", http.StatusOK, deposits, err)
}

/**
 * Original amount, mora & visits of one payment of a loan of the borrower
 */
func GetMyLoanPaymentBreakdown(response http.ResponseWriter, request *http.Request) {
	id, ok := ownLoanID(response, request)

	if !ok {
		return
	}

	paymentID, err := uuid.Parse(request.PathValue("paymentId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	breakdown, err := loans.GetBreakdown(request.Context(), id, paymentID)

	writeLoanResult(response, request, "handlers.GetMyLoanPaymentBreakdown.GetBreakdown", http.StatusOK, breakdown, err)
}

/**
 * The borrower reports a payment to the next payment of its loan (form data like the one of an
 * administrator: amount, payment & the receipt of a transfer). It stays pending until an
 * administrator accepts it, so the payment doesn't change yet.
 */
func RequestMyLoanPayment(response http.ResponseWriter, request *http.Request) {
	id, ok := ownLoanID(response, request)

	if !ok {
		return
	}

	paymentID, err := uuid.Parse(request.PathValue("paymentId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	amount, receipt, ok := readPaymentForm(response, request)

	if !ok {
		return
	}

	payments, err := loans.RequestPayment(request.Context(), id, paymentID, amount, receipt)

	writeLoanResult(response, request, "handlers.RequestMyLoanPayment.RequestPayment", http.StatusCreated, &payments, err)
}
