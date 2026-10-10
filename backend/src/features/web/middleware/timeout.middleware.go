package middleware

import (
	"net/http"
	"time"
)

const timeoutDuration time.Duration = 15 * time.Second

func timeoutMiddleware(handler http.Handler, duration time.Duration) http.Handler {
	if duration <= 0 {
		duration = timeoutDuration
	}

	return http.TimeoutHandler(handler, duration, "Server timeout")
}
