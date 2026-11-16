package router

import (
	"fmt"
	"net/http"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/api/handlers"
	"motiva-erp/backend/src/features/web/utilities/middleware"
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

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteSettings), handlers.GetSettings)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsExtras), handlers.UpdateExtraSettings)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsAgreements), handlers.UpdateAgreementSettings)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsMonthly), handlers.UpdateMonthlySettings)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsWeekly), handlers.UpdateWeeklySettings)

	root.Handle(repository.RouteMain, middleware.Pipeline(api, nil))

	// TODO: Config for endpoints to allow files
	// streamConfig := &models.MiddlewareConfig{ Timeout: 1 * time.Minute }
	// root.Handle("POST /api/investment/cancel-request", middleware.Pipeline(/*handler*/, *streamConfig))

	return root
}
