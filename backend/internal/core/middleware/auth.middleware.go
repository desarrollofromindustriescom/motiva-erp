package middleware

import (
	"motiva-erp/backend/internal/features/session"
	"net/http"
)

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		const unauthorized string = "Unauthorized"

		if request.Method == http.MethodPost && request.URL.Path == "/api/login" {
			next.ServeHTTP(response, request)
			return
		}

		agent := request.Header.Get("User-Agent")
		token, err := request.Cookie("bearer")

		if err != nil {
			http.SetCookie(response, &http.Cookie{
				Name:  "bearer",
				Value: "",
				Path:  "/",
			})
			http.Error(response, unauthorized, http.StatusUnauthorized)
			return
		}

		session, err := session.VerifySession(token.Value, agent, request.Context())

		if err != nil {
			http.SetCookie(response, &http.Cookie{
				Name:  "bearer",
				Value: "",
				Path:  "/",
			})
			http.Error(response, unauthorized, http.StatusUnauthorized)
			return
		}

		http.SetCookie(response, &http.Cookie{
			Name:     "bearer",
			Value:    session.Token,
			Expires:  session.TokenExp,
			Path:     "/",
			Secure:   true,
			HttpOnly: true,
		})

		next.ServeHTTP(response, request)
	})
}
