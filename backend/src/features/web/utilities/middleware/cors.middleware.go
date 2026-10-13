package middleware

import (
	"net/http"
	"os"

	"motiva-erp/backend/src/features/data/repository"
)

var trustOrigins map[string]bool = make(map[string]bool)

/**
 * Function to set allowed origins in request, eval
 * development environment to allow local server server
 */
func setTrustOrigins() {
	env := os.Getenv(repository.EnvEnv)

	trustOrigins["https://motiva-erp.pages.dev"] = true
	trustOrigins["https://www.motiva-erp.pages.dev"] = true

	if env == repository.EnvValDevelopment {
		trustOrigins["https://localhost:4200"] = true
	}
}

/**
 * Middleware to verify if origin request is allowed, set
 * access control headers and response status 200 if request
 * method is an http options
 */
func corsMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		origin := request.Header.Get(repository.HeadOrigin)

		if origin == "" || !trustOrigins[origin] {
			http.Error(response, repository.HttpCORSError, http.StatusUnauthorized)
			return
		}

		response.Header().Set(repository.HeadCORSOrigin, origin)
		response.Header().Set(repository.HeadCORSMethods, repository.HeadValCORSMethods)
		response.Header().Set(repository.HeadCORSHeaders, repository.HeadValCORSHeaders)

		if request.Method == http.MethodOptions {
			response.WriteHeader(http.StatusOK)
			return
		}

		handler.ServeHTTP(response, request)
	})
}
