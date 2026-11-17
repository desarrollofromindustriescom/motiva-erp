package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"slices"
	"strings"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/modules/authentication"
	"motiva-erp/backend/src/features/data/modules/session"
	"motiva-erp/backend/src/features/data/modules/users"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/utilities/i18n"
	"motiva-erp/backend/src/features/web/utilities/validation"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/google/uuid"
)

/**
 *
 */
func ChangePassword(response http.ResponseWriter, request *http.Request) {
	lang := request.Header.Get(repository.HeadAcceptLanguage)
	preview := &controller.EpPreview[struct{}]{}
	payload, details, err := validation.RequestPayloadValidation[controller.ChangePasswordPayload](response, request)

	if err != nil {
		slog.Error("Error on request payload validation",
			"event", "handlers.ChangePassword.RequestPayloadValidation",
			"error", err,
		)

		if details != nil {
			preview.Error = &controller.EpError{
				Message: i18n.Translate(lang, repository.ValI18nKeyFailFieldsValidation, nil),
				Details: []*controller.ErrorDetails{},
			}

			for _, detail := range *details {
				preview.Error.Details = append(preview.Error.Details, &controller.ErrorDetails{
					Field:  detail.Field,
					Detail: i18n.Translate(lang, repository.I18nTagsKeys[detail.Tag], map[string]any{"Param": detail.Param}),
				})
			}

			response.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(response).Encode(preview)
			return
		}

		var maxBytesErr *http.MaxBytesError

		if errors.Is(err, repository.ValErrInvalidDataType) {
			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
			return
		}

		if errors.As(err, &maxBytesErr) {
			http.Error(response, repository.HttpContentTooLarge, http.StatusRequestEntityTooLarge)
			return
		}

		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		slog.Error("Error starting transaction",
			"event", "handlers.ChangePassword.Begin",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	defer tx.Rollback(ctx)

	if err = authentication.UpdatePassword(ctx, tx, currentSession, payload); err != nil {
		switch {
		case errors.Is(err, repository.AuthErrPasswordMismatch):
			preview.Error = &controller.EpError{
				Message: i18n.Translate(lang, repository.AuthI18nKeyCurrentPasswordFailed, nil),
			}
		case errors.Is(err, repository.AuthErrNewPasswordSameAsCurrent):
			preview.Error = &controller.EpError{
				Message: i18n.Translate(lang, repository.AuthI18nKeyNewPasswordSameAsCurrent, nil),
			}
		case errors.Is(err, repository.AuthErrNewPasswordsMismatch):
			preview.Error = &controller.EpError{
				Message: i18n.Translate(lang, repository.AuthI18nKeyNewPasswordsFailed, nil),
			}
		default:
			slog.Error("Error updating user password",
				"event", "handlers.ChangePassword.UpdatePassword",
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
			return
		}

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(preview)
		return
	}

	if err = session.RevokeOtherSessions(ctx, tx, currentSession); err != nil {
		slog.Error("Error revoking user sessions",
			"event", "handlers.ChangePassword.RevokeOtherSessions",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(ctx); err != nil {
		slog.Error("Error committing transaction",
			"event", "handlers.ChangePassword.Commit",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview.Success = true

	response.WriteHeader(http.StatusOK)
	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	json.NewEncoder(response).Encode(preview)
}

/**
 *
 */
func Logout(response http.ResponseWriter, request *http.Request) {
	preview := &controller.EpPreview[struct{}]{}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	if err := session.RevokeSessionByToken(ctx, currentSession.Token); err != nil {
		slog.Error("Error revoking session",
			"event", "handlers.Logout.RevokeSessionByToken",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview.Success = true

	response.WriteHeader(http.StatusOK)
	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	json.NewEncoder(response).Encode(preview)
}

/**
 *
 */
func GetSessions(response http.ResponseWriter, request *http.Request) {
	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	sessions, err := session.GetActiveSessions(ctx, currentSession.User.ID, currentSession.ID)

	if err != nil {
		slog.Error("Error getting active sessions",
			"event", "handlers.GetSessions.GetActiveSessions",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview := &controller.EpPreview[[]*controller.ActiveSessionPreview]{
		Success: true,
		Data:    &sessions,
	}

	response.WriteHeader(http.StatusOK)
	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	json.NewEncoder(response).Encode(preview)
}

/**
 *
 */
func RevokeSessions(response http.ResponseWriter, request *http.Request) {
	preview := &controller.EpPreview[struct{}]{}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	if err := session.RevokeOtherSessions(ctx, database.GetPool(), currentSession); err != nil {
		slog.Error("Error revoking other sessions",
			"event", "handlers.RevokeOtherSessions.RevokeOtherSessions",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview.Success = true

	response.WriteHeader(http.StatusOK)
	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	json.NewEncoder(response).Encode(preview)
}

/**
 *
 */
func RevokeSession(response http.ResponseWriter, request *http.Request) {
	preview := &controller.EpPreview[struct{}]{}

	sessionID, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	if sessionID == currentSession.ID {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	if err = session.RevokeSessionByID(ctx, sessionID, currentSession.User.ID); err != nil {
		if errors.Is(err, repository.SsErrNotFound) {
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
			return
		}

		slog.Error("Error revoking session",
			"event", "handlers.RevokeSession.RevokeSessionByID",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview.Success = true

	response.WriteHeader(http.StatusOK)
	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Fields required by each profile (json names), guarantee fields
 * are only required when the borrower has guarantee
 */
func missingUserFields(payload *controller.CreateUserPayload) []string {
	required := map[string]string{"fullname": payload.Fullname}

	switch payload.Profile {
	case repository.ProfileInvestor:
		required["phone_number"] = payload.PhoneNumber
		required["curp"] = payload.CURP
		required["account_clabe"] = payload.AccountClabe
		required["account_bank"] = payload.AccountBank
	case repository.ProfileBorrower:
		required["phone_number"] = payload.PhoneNumber
		required["curp"] = payload.CURP
		required["address"] = payload.Address

		if payload.WithGuarantee {
			required["guarantee_fullname"] = payload.GuaranteeFullname
			required["guarantee_phone_number"] = payload.GuaranteePhoneNumber
			required["guarantee_address"] = payload.GuaranteeAddress
		}
	}

	missing := []string{}

	for field, value := range required {
		if strings.TrimSpace(value) == "" {
			missing = append(missing, field)
		}
	}

	slices.Sort(missing)

	return missing
}

/**
 * Creates a user of any creatable profile & returns the generated
 * credentials. A manager can only create investors & borrowers
 */
func CreateUser(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.CreateUserPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	if currentSession.User.Profile == repository.ProfileManager &&
		!slices.Contains(repository.UsrManagerCreatableProfiles, payload.Profile) {
		http.Error(response, repository.HttpForbidden, http.StatusForbidden)
		return
	}

	payload.Fullname = strings.TrimSpace(payload.Fullname)
	payload.Address = strings.TrimSpace(payload.Address)
	payload.GuaranteeFullname = strings.TrimSpace(payload.GuaranteeFullname)
	payload.GuaranteeAddress = strings.TrimSpace(payload.GuaranteeAddress)
	payload.AccountBank = strings.TrimSpace(payload.AccountBank)

	if missing := missingUserFields(payload); len(missing) > 0 {
		writeMissingFields(response, request, missing)
		return
	}

	created, err := users.Create(ctx, payload)

	if err != nil {
		slog.Error("Error creating user",
			"event", "handlers.CreateUser.Create",
			"profile", payload.Profile,
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview := &controller.EpPreview[controller.CreatedUserPreview]{
		Success: true,
		Data:    created,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusCreated)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Paginated users with optional combined filters. Uses QUERY
 * method (reads data but receives the filters in the body).
 * A manager only sees investors & borrowers.
 */
func QueryUsers(response http.ResponseWriter, request *http.Request) {
	payload, ok := readPayload[controller.UsersQueryPayload](response, request)

	if !ok {
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)
	profiles := visibleProfiles(currentSession.User)

	page, err := users.GetPage(ctx, payload, profiles)

	if err != nil {
		slog.Error("Error getting users page",
			"event", "handlers.QueryUsers.GetPage",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview := &controller.EpPreview[controller.UsersPagePreview]{
		Success: true,
		Data:    page,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Profiles the user is allowed to see in the users module:
 * a manager only sees investors & borrowers
 */
func visibleProfiles(user *models.User) []string {
	if user.Profile == repository.ProfileManager {
		return repository.UsrManagerCreatableProfiles
	}

	return repository.UsrAllProfiles
}

/**
 * Every stored field of one user (detail dialog)
 */
func GetUser(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	user, err := users.GetByID(ctx, id, visibleProfiles(currentSession.User))

	if err != nil {
		if errors.Is(err, repository.UsrErrNotFound) {
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
			return
		}

		slog.Error("Error getting user detail",
			"event", "handlers.GetUser.GetByID",
			"error", err,
		)

		http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		return
	}

	preview := &controller.EpPreview[controller.UserDetailPreview]{
		Success: true,
		Data:    user,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Deletes (deactivates) a user: it can't log in anymore & its
 * sessions are revoked. The frontend refreshes the table afterwards.
 */
func DeleteUser(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	err = users.Deactivate(ctx, currentSession.User, id, visibleProfiles(currentSession.User))

	if err != nil {
		switch {
		case errors.Is(err, repository.UsrErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.UsrErrDeleteSelf):
			writeBadRequest(response, request, repository.UsrI18nKeyDeleteSelf)
		case errors.Is(err, repository.UsrErrDeleteProtected):
			writeBadRequest(response, request, repository.UsrI18nKeyDeleteProtected)
		case errors.Is(err, repository.UsrErrAlreadyInactive):
			writeBadRequest(response, request, repository.UsrI18nKeyAlreadyInactive)
		default:
			slog.Error("Error deleting user",
				"event", "handlers.DeleteUser.Deactivate",
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		}

		return
	}

	preview := &controller.EpPreview[struct{}]{Success: true}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Writes a 400 response listing the required fields that came empty
 */
func writeMissingFields(response http.ResponseWriter, request *http.Request, missing []string) {
	lang := request.Header.Get(repository.HeadAcceptLanguage)
	preview := &controller.EpPreview[struct{}]{
		Error: &controller.EpError{
			Message: i18n.Translate(lang, repository.ValI18nKeyFailFieldsValidation, nil),
			Details: []*controller.ErrorDetails{},
		},
	}

	for _, field := range missing {
		preview.Error.Details = append(preview.Error.Details, &controller.ErrorDetails{
			Field:  field,
			Detail: i18n.Translate(lang, repository.ValI18nKeyFieldRequired, nil),
		})
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Edits an investor or a borrower & returns the updated data. A manager
 * can only edit the profiles it sees, other profiles have nothing to edit.
 */
func UpdateUser(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	payload, ok := readPayload[controller.UpdateUserPayload](response, request)

	if !ok {
		return
	}

	payload.Address = strings.TrimSpace(payload.Address)
	payload.GuaranteeFullname = strings.TrimSpace(payload.GuaranteeFullname)
	payload.GuaranteeAddress = strings.TrimSpace(payload.GuaranteeAddress)
	payload.AccountBank = strings.TrimSpace(payload.AccountBank)

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	updated, missing, err := users.Update(ctx, id, visibleProfiles(currentSession.User), payload)

	if err != nil {
		switch {
		case errors.Is(err, repository.UsrErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.UsrErrNotEditable):
			writeBadRequest(response, request, repository.UsrI18nKeyNotEditable)
		case errors.Is(err, repository.UsrErrGuaranteeRemoval):
			writeBadRequest(response, request, repository.UsrI18nKeyGuaranteeRemoval)
		default:
			slog.Error("Error updating user",
				"event", "handlers.UpdateUser.Update",
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		}

		return
	}

	if len(missing) > 0 {
		writeMissingFields(response, request, missing)
		return
	}

	preview := &controller.EpPreview[controller.UserDetailPreview]{
		Success: true,
		Data:    updated,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}

/**
 * Regenerates the password of a user: the old one stops working and
 * the new random one is returned once so it can be copied
 */
func RegenerateUserPassword(response http.ResponseWriter, request *http.Request) {
	id, err := uuid.Parse(request.PathValue("id"))

	if err != nil {
		http.Error(response, repository.HttpBadRequest, http.StatusBadRequest)
		return
	}

	ctx := request.Context()
	currentSession := ctx.Value("session").(*models.Session)

	credentials, err := users.RegeneratePassword(ctx, currentSession.User, id, visibleProfiles(currentSession.User))

	if err != nil {
		switch {
		case errors.Is(err, repository.UsrErrNotFound):
			http.Error(response, repository.HttpNotFound, http.StatusNotFound)
		case errors.Is(err, repository.UsrErrPasswordSelf):
			writeBadRequest(response, request, repository.UsrI18nKeyPasswordSelf)
		case errors.Is(err, repository.UsrErrPasswordProtected):
			writeBadRequest(response, request, repository.UsrI18nKeyPasswordProtected)
		default:
			slog.Error("Error regenerating user password",
				"event", "handlers.RegenerateUserPassword.RegeneratePassword",
				"error", err,
			)

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
		}

		return
	}

	preview := &controller.EpPreview[controller.CreatedUserPreview]{
		Success: true,
		Data:    credentials,
	}

	response.Header().Set(repository.HeadContentType, repository.ValMimeJson)
	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(preview)
}
