package middleware

import "net/http"

var trustOrigins map[string]bool = map[string]bool{
	"https://motiva-erp.pages.dev": true,
	"http://localhost:4200":        true,
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		origin := request.Header.Get("Origin")

		if valid := trustOrigins[origin]; valid {
			response.Header().Set("Access-Control-Allow-Origin", origin)
			response.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, QUERY, OPTIONS")
			response.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if request.Method == http.MethodOptions {
				response.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(response, request)
			return
		}

		http.Error(response, "CORS Error", http.StatusUnauthorized)
	})
}
