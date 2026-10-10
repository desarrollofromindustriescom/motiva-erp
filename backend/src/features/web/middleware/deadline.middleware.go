package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

const deadlineDuration time.Duration = 90 * time.Second

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
