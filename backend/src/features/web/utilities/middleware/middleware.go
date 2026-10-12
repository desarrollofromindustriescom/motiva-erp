package middleware

import (
	"net/http"
	"time"

	"motiva-erp/backend/src/interfaces/models"
)

/**
 * Function to initialize middleware constant values
 */
func Init() {
	setTrustOrigins()
}

/**
 * Main package function to wrap handler with multiple
 * middleware function, at first check configuration and
 * wrap handler dynamically and return handler result
 */
func Pipeline(handler http.Handler, config *models.MiddlewareConfig) http.Handler {
	settings := config

	if settings == nil {
		settings = &models.MiddlewareConfig{}
	}

	handler = timeoutMiddleware(handler, settings.Timeout)

	if settings.Timeout > 0 {
		handler = deadlineMiddleware(handler, settings.Timeout+30*time.Second)
	}

	handler = corsMiddleware(handler)
	handler = rateLimitMiddleware(handler)

	return handler
}
