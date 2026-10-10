package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"motiva-erp/backend/src/features/data/repository"
)

/**
 * Set handler wrapper to extend server's expected time
 * to write a response
 */
func deadlineMiddleware(handler http.Handler, duration time.Duration) http.Handler {
	if duration <= 0 {
		duration = repository.MwDeadlineDuration
	}

	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		controller := http.NewResponseController(response)

		if err := controller.SetWriteDeadline(time.Now().Add(duration)); err != nil {
			slog.Error("Error setting write extended deadline",
				"event", "middleware.deadlineMiddleware.SetWriteDeadline",
				"error", err,
			)
		}

		handler.ServeHTTP(response, request)
	})
}
