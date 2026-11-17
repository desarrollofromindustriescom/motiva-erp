package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"unicode/utf8"

	"motiva-erp/backend/src/features/data/modules/cashbalance"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/utilities/i18n"
	"motiva-erp/backend/src/features/web/utilities/validation"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/google/uuid"
)

/**
 * Writes the error of a form data request: too large requests have
 * their own status, any other problem is a bad request
 */
func writeFormDataError(response http.ResponseWriter, err error) {
	var maxBytesErr *http.MaxBytesError

	if errors.As(err, &maxBytesErr) {
		http.Error(response, repository.HttpContentTooLarge, http.StatusRequestEntityTooLarge)
		return
	}

	http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
}

/**
 * Creates the cancellation request of one or more active investments of an
 * investor from a multipart form: the pdf in "document", the reasons in
 * "message" & the ids of the investments, one "investments" value for each.
 * The request is registered as pending & the pdf is stored by the backend.
 */
func CreateCancellation(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	allowed := &models.FormDataContent{
		Values: map[string]bool{"message": true, "investments": true},
		Files:  map[string]bool{"document": true},
	}

	if err = validation.RequestDataValidation(response, request, allowed); err != nil {
		writeFormDataError(response, err)
		return
	}

	form := request.MultipartForm

	if err = validation.ValidatePDF(form, "document"); err != nil {
		switch {
		case errors.Is(err, repository.ValErrFileLength):
			writeMissingFields(response, request, []string{"document"})
		case errors.Is(err, repository.ValErrFileSize):
			writeBadRequest(response, request, repository.CcI18nKeyFileTooLarge)
		case errors.Is(err, repository.ValErrUnsupportedFile):
			writeBadRequest(response, request, repository.CcI18nKeyFileNotPDF)
		default:
			http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		}

		return
	}

	message := ""

	if values := form.Value["message"]; len(values) == 1 {
		message = strings.TrimSpace(values[0])
	}

	investments := []uuid.UUID{}
	seen := map[uuid.UUID]bool{}

	for _, value := range form.Value["investments"] {
		investment, err := uuid.Parse(strings.TrimSpace(value))

		if err != nil {
			http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
			return
		}

		if !seen[investment] {
			seen[investment] = true
			investments = append(investments, investment)
		}
	}

	if len(investments) > repository.CcMaxInvestments {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	missing := []string{}

	if len(investments) == 0 {
		missing = append(missing, "investments")
	}

	if message == "" {
		missing = append(missing, "message")
	}

	if len(missing) > 0 {
		writeMissingFields(response, request, missing)
		return
	}

	if utf8.RuneCountInString(message) > repository.CcMaxMessageLength {
		lang := request.Header.Get(repository.HeadAcceptLanguage)
		preview := &controller.EpPreview[struct{}]{
			Error: &controller.EpError{
				Message: i18n.Translate(lang, repository.ValI18nKeyFailFieldsValidation, nil),
				Details: []*controller.ErrorDetails{{
					Field:  "message",
					Detail: i18n.Translate(lang, repository.UsrI18nKeyFieldMaxLength, map[string]any{"Param": repository.CcMaxMessageLength}),
				}},
			},
		}

		response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(preview)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	balance, err := cashbalance.CreateCancellation(ctx, id, visibleProfiles(currentSession.User), message, investments, form.File["document"][0])

	if err != nil {
		switch {
		case errors.Is(err, repository.UsrErrNotFound), errors.Is(err, repository.CbErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.CbErrNotInvestor):
			writeBadRequest(response, request, repository.CbI18nKeyNotInvestor)
		case errors.Is(err, repository.CcErrPending):
			writeBadRequest(response, request, repository.CcI18nKeyPending)
		case errors.Is(err, repository.CcErrInvestmentsInvalid):
			writeBadRequest(response, request, repository.CcI18nKeyInvestmentsInvalid)
		default:
			slog.Error("Error creating cancellation request",
				"event", "handlers.CreateCancellation.CreateCancellation",
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
	response.WriteHeader(http.StatusCreated)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Writes the errors the cancellation review endpoints share
 */
func writeCancellationError(response http.ResponseWriter, request *http.Request, event string, err error) {
	switch {
	case errors.Is(err, repository.UsrErrNotFound), errors.Is(err, repository.CbErrNotFound), errors.Is(err, repository.CcErrNoPending), errors.Is(err, repository.CcErrDocumentMissing):
		http.Error(response, repository.HttpNotFound, http.StatusNotFound)
	case errors.Is(err, repository.CbErrNotInvestor):
		writeBadRequest(response, request, repository.CbI18nKeyNotInvestor)
	case errors.Is(err, repository.CcErrInvestmentsInvalid):
		writeBadRequest(response, request, repository.CcI18nKeyInvestmentsInvalid)
	case errors.Is(err, repository.CcErrGeneralInsufficient):
		writeBadRequest(response, request, repository.CcI18nKeyGeneralInsufficient)
	case errors.Is(err, repository.CcErrInvestorInsufficient):
		writeBadRequest(response, request, repository.CcI18nKeyInvestorInsufficient)
	case errors.Is(err, repository.CbErrLimit):
		writeBadRequest(response, request, repository.CbI18nKeyLimit)
	default:
		slog.Error("Error on cancellation request",
			"event", event,
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
	}
}

/**
 * Pending cancellation request of an investor with its investments & totals
 */
func GetPendingCancellation(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	pending, err := cashbalance.GetPendingCancellation(ctx, id, visibleProfiles(currentSession.User))

	if err != nil {
		writeCancellationError(response, request, "handlers.GetPendingCancellation.GetPendingCancellation", err)
		return
	}

	preview := &controller.EpPreview[controller.CancellationPreview]{
		Success: true,
		Data:    pending,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Pdf of a cancellation request, shown inline by the review dialog
 */
func GetCancellationDocument(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	requestID, err := uuid.Parse(request.PathValue("requestId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	path, err := cashbalance.GetCancellationDocumentPath(ctx, id, requestID, visibleProfiles(currentSession.User))

	if err != nil {
		writeCancellationError(response, request, "handlers.GetCancellationDocument.GetCancellationDocumentPath", err)
		return
	}

	file, err := os.Open(path)

	if err != nil {
		writeCancellationError(response, request, "handlers.GetCancellationDocument.Open", err)
		return
	}

	defer file.Close()

	info, err := file.Stat()

	if err != nil {
		writeCancellationError(response, request, "handlers.GetCancellationDocument.Stat", err)
		return
	}

	response.Header().Set(repository.HeadContentType, "application/pdf")
	response.Header().Set("Content-Disposition", `inline; filename="cancelacion.pdf"`)
	response.Header().Set("X-Content-Type-Options", "nosniff")
	response.Header().Set("Cache-Control", "private, no-store")

	http.ServeContent(response, request, "cancelacion.pdf", info.ModTime(), file)
}

/**
 * Approves or rejects the pending request of an investor & returns its balance
 */
func answerCancellation(response http.ResponseWriter, request *http.Request, approve bool) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	requestID, err := uuid.Parse(request.PathValue("requestId"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)
	profiles := visibleProfiles(currentSession.User)

	var balance *controller.InvestorBalancePreview

	if approve {
		balance, err = cashbalance.ApproveCancellation(ctx, currentSession.User, id, requestID, profiles)
	} else {
		balance, err = cashbalance.RejectCancellation(ctx, id, requestID, profiles)
	}

	if err != nil {
		writeCancellationError(response, request, "handlers.answerCancellation", err)
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

func ApproveCancellation(response http.ResponseWriter, request *http.Request) {
	answerCancellation(response, request, true)
}

func RejectCancellation(response http.ResponseWriter, request *http.Request) {
	answerCancellation(response, request, false)
}
