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
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLogout), handlers.Logout)

	root.Handle(repository.RouteMain, middleware.Pipeline(api, nil))

	// TODO: Config for endpoints to allow files
	// streamConfig := &models.MiddlewareConfig{ Timeout: 1 * time.Minute }
	// root.Handle("POST /api/investment/cancel-request", middleware.Pipeline(/*handler*/, *streamConfig))

	return root
}
