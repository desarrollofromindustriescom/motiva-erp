package middleware

import (
	"log/slog"
	"net/http"
	"slices"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/models"
)

/**
 * Wraps a single handler so only the given profiles can reach it.
 * It must run after authenticationMiddleware (part of Pipeline),
 * which sets the current session in the request context. Handlers
 * without it are open to any authenticated user.
 */
func Authorize(handler http.HandlerFunc, profiles ...string) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		currentSession, ok := request.Context().Value("session").(*models.Session)

		if !ok || currentSession == nil || currentSession.User == nil {
			http.Error(response, repository.HttpUnauthorized, http.StatusUnauthorized)
			return
		}

		if !slices.Contains(profiles, currentSession.User.Profile) {
			slog.Warn("Profile not authorized for endpoint",
				"event", "middleware.Authorize",
				"profile", currentSession.User.Profile,
				"path", request.URL.Path,
				"method", request.Method,
			)

			http.Error(response, repository.HttpForbidden, http.StatusForbidden)
			return
		}

		handler(response, request)
	}
}
