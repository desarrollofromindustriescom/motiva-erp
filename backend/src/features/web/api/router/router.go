package router

import (
	"net/http"

	"motiva-erp/backend/src/features/web/utilities/middleware"
)

func Router() *http.ServeMux {
	root := http.NewServeMux()
	api := http.NewServeMux()

	root.Handle("/api/", middleware.Pipeline(api, nil))

	// TODO: Config for endpoints to allow files
	// streamConfig := &models.MiddlewareConfig{ Timeout: 1 * time.Minute }
	// root.Handle("POST /api/investment/cancel-request", middleware.Pipeline(/*handler*/, *streamConfig))

	return root
}
