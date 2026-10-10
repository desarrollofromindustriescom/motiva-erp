package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

const deadlineDuration time.Duration = timeoutDuration + 30*time.Second

/**
 * Set handler wrapper to extend server's expected time
 * to write a response
 */
func deadlineMiddleware(handler http.Handler, duration time.Duration) http.Handler {
	if duration <= 0 {
		duration = deadlineDuration
	}

	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		controller := http.NewResponseController(response)

		if err := controller.SetWriteDeadline(time.Now().Add(duration)); err != nil {
			slog.Error("Error setting write extended deadline",
				"event", "middleware.deadlinemiddleware.setwritedeadline",
				"error", err,
			)
		}

		handler.ServeHTTP(response, request)
	})
}
