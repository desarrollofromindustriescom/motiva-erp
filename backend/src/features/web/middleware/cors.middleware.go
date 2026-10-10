package middleware

import (
	"net/http"
	"os"
)

var trustOrigins map[string]bool = make(map[string]bool)

func setTrustOrigins() {
	env := os.Getenv("ENV")

	trustOrigins["https://motiva-erp.pages.dev"] = true
	trustOrigins["https://www.motiva-erp.pages.dev"] = true

	if env == "DEVELOPMENT" {
		trustOrigins["https://localhost:4200"] = true
	}
}

func corsMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		origin := request.Header.Get("Origin")

		if allowed := trustOrigins[origin]; allowed {
			response.Header().Set("Access-Control-Allow-Origin", origin)
			response.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, QUERY, OPTIONS")
			response.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if request.Method == http.MethodOptions {
				response.WriteHeader(http.StatusOK)
				return
			}

			handler.ServeHTTP(response, request)
			return
		}

		http.Error(response, "CORS Error", http.StatusUnauthorized)
	})
}
