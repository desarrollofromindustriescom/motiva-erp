package router

import (
	"fmt"
	"net/http"
	"time"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/api/handlers"
	"motiva-erp/backend/src/features/web/utilities/middleware"
	"motiva-erp/backend/src/interfaces/models"
)

func Router() *http.ServeMux {
	root := http.NewServeMux()
	api := http.NewServeMux()

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLogin), handlers.Login)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteValidate), handlers.Validate)

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPatch, repository.RouteChangePassword), handlers.ChangePassword)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteSessions), handlers.GetSessions)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodDelete, repository.RouteRevokeSessions), handlers.RevokeSessions)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodDelete, repository.RouteRevokeSession), handlers.RevokeSession)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLogout), handlers.Logout)

	// Settings & general cash balance: only superadmin & administrator
	settingsProfiles := []string{repository.ProfileSuperadmin, repository.ProfileAdministrator}

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteCashBalance), middleware.Authorize(handlers.GetCashBalance, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteCashMovements), middleware.Authorize(handlers.QueryCashMovements, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteCashDeposit), middleware.Authorize(handlers.DepositCashBalance, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteCashWithdraw), middleware.Authorize(handlers.WithdrawCashBalance, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteSettings), middleware.Authorize(handlers.GetSettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsExtras), middleware.Authorize(handlers.UpdateExtraSettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsAgreements), middleware.Authorize(handlers.UpdateAgreementSettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsMonthly), middleware.Authorize(handlers.UpdateMonthlySettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsWeekly), middleware.Authorize(handlers.UpdateWeeklySettings, settingsProfiles...))

	// Users module: superadmin, administrator & manager (a manager can only create investors & borrowers)
	usersProfiles := []string{repository.ProfileSuperadmin, repository.ProfileAdministrator, repository.ProfileManager}

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUsers), middleware.Authorize(handlers.CreateUser, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteUsers), middleware.Authorize(handlers.QueryUsers, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteUser), middleware.Authorize(handlers.GetUser, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodDelete, repository.RouteUser), middleware.Authorize(handlers.DeleteUser, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteUser), middleware.Authorize(handlers.UpdateUser, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserPassword), middleware.Authorize(handlers.RegenerateUserPassword, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteUserBalance), middleware.Authorize(handlers.GetInvestorBalance, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserBalanceDeposit), middleware.Authorize(handlers.DepositInvestorBalance, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserBalanceWithdraw), middleware.Authorize(handlers.WithdrawInvestorBalance, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteUserMovements), middleware.Authorize(handlers.QueryInvestorMovements, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteCashCycles), middleware.Authorize(handlers.GetCashCycles, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteUserInvestments), middleware.Authorize(handlers.QueryInvestorInvestments, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserInvestments), middleware.Authorize(handlers.CreateInvestorInvestment, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteUserInvestmentMovements), middleware.Authorize(handlers.QueryInvestmentMovements, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteUserCancellationPending), middleware.Authorize(handlers.GetPendingCancellation, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteUserCancellationDocument), middleware.Authorize(handlers.GetCancellationDocument, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserCancellationApprove), middleware.Authorize(handlers.ApproveCancellation, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserCancellationReject), middleware.Authorize(handlers.RejectCancellation, usersProfiles...))

	root.Handle(repository.RouteMain, middleware.Pipeline(api, nil))

	// Endpoints with files need more time to read the request, so they use their
	// own middleware config instead of the default one. The more specific route
	// takes precedence over the generic api one.
	streamConfig := &models.MiddlewareConfig{Timeout: 1 * time.Minute}

	root.Handle(
		fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserCancellations),
		middleware.Pipeline(middleware.Authorize(handlers.CreateCancellation, usersProfiles...), streamConfig),
	)

	return root
}
