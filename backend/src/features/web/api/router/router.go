package router

import (
	"fmt"
	"net/http"

	"motiva-erp/backend/src/features/web/utilities/middleware"
)

func Router() *http.ServeMux {
	root := http.NewServeMux()
	api := http.NewServeMux()

	// TODO: Test endpoint to get render ip, remove after finish
	api.HandleFunc("GET /debug/ip", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "RemoteAddr: %s\nXFF: %q\nCF-Connecting-IP: %q\nTrue-Client-IP: %q\n",
			r.RemoteAddr,
			r.Header.Values("X-Forwarded-For"),
			r.Header.Get("CF-Connecting-IP"),
			r.Header.Get("True-Client-IP"),
		)
	})

	root.Handle("/api/", middleware.Pipeline(api, nil))

	// TODO: Config for endpoints to allow files
	// streamConfig := &models.MiddlewareConfig{ Timeout: 1 * time.Minute }
	// root.Handle("POST /api/investment/cancel-request", middleware.Pipeline(/*handler*/, *streamConfig))

	return root
}
