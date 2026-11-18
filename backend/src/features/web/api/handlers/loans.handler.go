package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"math"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"motiva-erp/backend/src/features/data/modules/loans"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/utilities/validation"
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
		case errors.Is(err, repository.AgErrLoans):
			writeBadRequest(response, request, repository.AgI18nKeyLoans)
		case errors.Is(err, repository.AgErrFunds):
			writeBadRequest(response, request, repository.AgI18nKeyFunds)
		case errors.Is(err, repository.AgErrRate):
			writeBadRequest(response, request, repository.AgI18nKeyRate)
		case errors.Is(err, repository.AgErrVisit):
			writeBadRequest(response, request, repository.AgI18nKeyVisit)
		case errors.Is(err, repository.LnErrVisitNotCurrent):
			writeBadRequest(response, request, repository.LnI18nKeyVisitNotCurrent)
		case errors.Is(err, repository.LnErrExtraSetting):
			writeBadRequest(response, request, repository.LnI18nKeyExtraSetting)
		case errors.Is(err, repository.LnErrTicketNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.LnErrDepositPending):
			writeBadRequest(response, request, repository.LnI18nKeyDepositPending)
		case errors.Is(err, repository.LnErrDepositAnswered):
			writeBadRequest(response, request, repository.LnI18nKeyDepositAnswered)
		case errors.Is(err, repository.LnErrTicketExists):
			writeBadRequest(response, request, repository.LnI18nKeyTicketExists)
		case errors.Is(err, repository.LnErrTicketStatus):
			writeBadRequest(response, request, repository.LnI18nKeyTicketStatus)
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

	amount, receipt, ok := readPaymentForm(response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	payments, err := loans.PayPayment(ctx, currentSession.User, loanID, paymentID, amount, receipt)

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

	amount, receipt, ok := readPaymentForm(response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	payments, err := loans.PayLoan(ctx, currentSession.User, loanID, amount, receipt)

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

/**
 * Loans of a borrower that can go to an agreement & the percentage of the agreements
 */
func QueryAgreementLoans(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.AgreementLoansQueryPayload](response, request)

	if !ok {
		return
	}

	borrowerID, err := uuid.Parse(payload.BorrowerID)

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	eligible, err := loans.GetAgreementLoans(request.Context(), borrowerID)

	writeLoanResult(response, request, "handlers.QueryAgreementLoans.GetAgreementLoans", http.StatusOK, eligible, err)
}

/**
 * Starts an agreement: its loans are cancelled & the investors get back what they lent
 */
func CreateAgreement(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.NewAgreementPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	agreement, err := loans.CreateAgreement(ctx, currentSession.User, payload)

	writeLoanResult(response, request, "handlers.CreateAgreement.CreateAgreement", http.StatusCreated, agreement, err)
}

/**
 * Reads how something was paid from a multipart form: "payment" (cash or transfer) & the image of
 * the receipt in "file", that only transfers have (png, jpg or jpeg). It writes the response of
 * the problem & returns false when the data isn't valid.
 */
func readReceipt(response http.ResponseWriter, request *http.Request, form *multipart.Form) (*loans.Receipt, bool) {
	payment := ""

	if values := form.Value["payment"]; len(values) == 1 {
		payment = strings.TrimSpace(values[0])
	}

	if payment == "" {
		writeMissingFields(response, request, []string{"payment"})
		return nil, false
	}

	if payment != repository.LnPaymentCash && payment != repository.LnPaymentTransfer {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return nil, false
	}

	receipt := &loans.Receipt{Method: payment}

	if payment == repository.LnPaymentCash {
		// there is no receipt of cash
		if len(form.File["file"]) > 0 {
			writeBadRequest(response, request, repository.LnI18nKeyTicketUnexpected)
			return nil, false
		}

		return receipt, true
	}

	kind, err := validation.ValidateImage(form, "file")

	if err != nil {
		switch {
		case errors.Is(err, repository.ValErrFileLength):
			writeMissingFields(response, request, []string{"file"})
		case errors.Is(err, repository.ValErrFileSize):
			writeBadRequest(response, request, repository.CcI18nKeyFileTooLarge)
		case errors.Is(err, repository.ValErrImageTooLarge):
			writeBadRequest(response, request, repository.LnI18nKeyTicketTooLarge)
		case errors.Is(err, repository.ValErrUnsupportedFile):
			writeBadRequest(response, request, repository.LnI18nKeyTicketNotImage)
		default:
			http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		}

		return nil, false
	}

	receipt.Kind = kind
	receipt.Header = form.File["file"][0]

	return receipt, true
}

/**
 * Reads a payment of money from a multipart form: "amount", "payment" & the receipt of a transfer
 * in "file" (see readReceipt)
 */
func readPaymentForm(response http.ResponseWriter, request *http.Request) (float64, *loans.Receipt, bool) {
	allowed := &models.FormDataContent{
		Values: map[string]bool{"amount": true, "payment": true},
		Files:  map[string]bool{"file": true},
	}

	if err := validation.RequestDataValidation(response, request, allowed); err != nil {
		writeFormDataError(response, err)
		return 0, nil, false
	}

	form := request.MultipartForm
	text := ""

	if values := form.Value["amount"]; len(values) == 1 {
		text = strings.TrimSpace(values[0])
	}

	if text == "" {
		writeMissingFields(response, request, []string{"amount"})
		return 0, nil, false
	}

	amount, err := strconv.ParseFloat(text, 64)

	if err != nil || math.IsNaN(amount) || math.IsInf(amount, 0) || amount <= 0 || amount > 100000 {
		writeBadRequest(response, request, repository.LnI18nKeyPaymentAmount)
		return 0, nil, false
	}

	receipt, ok := readReceipt(response, request, form)

	return amount, receipt, ok
}

/**
 * Registers how a loan was handed to the borrower from a multipart form: "payment" (cash or
 * transfer) & the image of the receipt in "file", that only transfers have (png, jpg or jpeg).
 * It is only a record & it can be done once. Returns the detail of the loan.
 */
func RegisterLoanTicket(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	allowed := &models.FormDataContent{
		Values: map[string]bool{"payment": true},
		Files:  map[string]bool{"file": true},
	}

	if err = validation.RequestDataValidation(response, request, allowed); err != nil {
		writeFormDataError(response, err)
		return
	}

	receipt, ok := readReceipt(response, request, request.MultipartForm)

	if !ok {
		return
	}

	ctx := request.Context()

	if err = loans.RegisterTicket(ctx, id, receipt.Method, receipt.Kind, receipt.Header); err != nil {
		writeLoanResult[controller.LoanDetailPreview](response, request, "handlers.RegisterLoanTicket.RegisterTicket", http.StatusCreated, nil, err)
		return
	}

	loan, err := loans.GetByID(ctx, id)

	writeLoanResult(response, request, "handlers.RegisterLoanTicket.GetByID", http.StatusCreated, loan, err)
}

/**
 * Shows an image of a receipt inline
 */
func serveTicket(response http.ResponseWriter, request *http.Request, event string, path string, mime string, err error) {
	if err != nil {
		writeLoanResult[struct{}](response, request, event, http.StatusOK, nil, err)
		return
	}

	file, err := os.Open(path)

	if err != nil {
		http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		return
	}

	defer file.Close()

	info, err := file.Stat()

	if err != nil {
		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	response.Header().Set(repository.HeadContentType, mime)
	response.Header().Set("Content-Disposition", `inline; filename="comprobante"`)
	response.Header().Set("X-Content-Type-Options", "nosniff")
	response.Header().Set("Cache-Control", "private, no-store")

	http.ServeContent(response, request, "comprobante", info.ModTime(), file)
}

/**
 * Image of the receipt of a loan, shown inline by the detail dialog
 */
func GetLoanTicket(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	path, mime, err := loans.GetTicketPath(request.Context(), id)

	serveTicket(response, request, "handlers.GetLoanTicket.GetTicketPath", path, mime, err)
}

/**
 * Image of the receipt of a payment made to a payment of a loan
 */
func getDepositTicket(response http.ResponseWriter, request *http.Request, loanID uuid.UUID) {
	paymentID, err := uuid.Parse(request.PathValue("paymentId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	depositID, err := uuid.Parse(request.PathValue("depositId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	path, mime, err := loans.GetDepositTicketPath(request.Context(), loanID, paymentID, depositID)

	serveTicket(response, request, "handlers.getDepositTicket.GetDepositTicketPath", path, mime, err)
}

func GetLoanDepositTicket(response http.ResponseWriter, request *http.Request) {
	loanID, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	getDepositTicket(response, request, loanID)
}

/**
 * Same as GetLoanDepositTicket, only for the loans of the borrower
 */
func GetMyLoanDepositTicket(response http.ResponseWriter, request *http.Request) {
	id, ok := ownLoanID(response, request)

	if !ok {
		return
	}

	getDepositTicket(response, request, id)
}

/**
 * Pending payment of a payment of a loan, accepted or rejected by an administrator. Returns the
 * payments of the loan updated.
 */
func answerDeposit(response http.ResponseWriter, request *http.Request, accept bool) {
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

	depositID, err := uuid.Parse(request.PathValue("depositId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()

	var payments []*controller.LoanPaymentPreview

	if accept {
		currentSession := ctx.Value("session").(*models.Session)
		payments, err = loans.AcceptDeposit(ctx, currentSession.User, loanID, paymentID, depositID)
	} else {
		payments, err = loans.RejectDeposit(ctx, loanID, paymentID, depositID)
	}

	writeLoanResult(response, request, "handlers.answerDeposit", http.StatusOK, &payments, err)
}

func AcceptLoanDeposit(response http.ResponseWriter, request *http.Request) {
	answerDeposit(response, request, true)
}

func RejectLoanDeposit(response http.ResponseWriter, request *http.Request) {
	answerDeposit(response, request, false)
}
