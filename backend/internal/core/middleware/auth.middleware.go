package middleware

import (
	"context"
	"motiva-erp/backend/internal/features/session"
	"net/http"
)

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		const unauthorized string = "Unauthorized"

		if request.Method == http.MethodPost && request.URL.Path == "/api/login" {
			response.Header().Add("Content-type", "application/json")
			next.ServeHTTP(response, request)
			return
		}

		agent := request.Header.Get("User-Agent")
		token := request.Header.Get("Authorization")

		session, err := session.VerifySession(token, agent, request.Context())

		if err != nil {
			http.Error(response, unauthorized, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(request.Context(), "session", session)

		response.Header().Add("Content-type", "application/json")
		next.ServeHTTP(response, request.WithContext(ctx))
	})
}
