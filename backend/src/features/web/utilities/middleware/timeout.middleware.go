package middleware

import (
	"net/http"
	"time"

	"motiva-erp/backend/src/features/data/repository"
)

/**
 * Set handler context timeout to response service
 * unavailable if time expire and verify into handler function
 */
func timeoutMiddleware(handler http.Handler, duration time.Duration) http.Handler {
	if duration <= 0 {
		duration = repository.MwTimeoutDuration
	}

	return http.TimeoutHandler(handler, duration, "Server timeout")
}
