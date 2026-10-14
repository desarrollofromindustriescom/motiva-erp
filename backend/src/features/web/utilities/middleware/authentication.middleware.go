package middleware

import (
	"context"
	"net/http"
	"strings"

	"motiva-erp/backend/src/features/data/modules/session"
	"motiva-erp/backend/src/features/data/repository"
)

var authorizedRoutes map[string]string = map[string]string{
	repository.RouteLogin: http.MethodPost,
}

func authenticationMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if method, exists := authorizedRoutes[request.URL.Path]; exists && method == request.Method {
			handler.ServeHTTP(response, request)
			return
		}

		bearer := request.Header.Get(repository.HeadAuthorization)
		parts := strings.Split(bearer, " ")

		if len(parts) != 2 || parts[0] != repository.MwAuthTokenKey || len(parts[1]) != repository.MwAuthTokenLength {
			http.Error(response, repository.HttpUnauthorized, http.StatusUnauthorized)
			return
		}

		session, err := session.VerifySession(parts[1], request)

		if err != nil {
			http.Error(response, repository.HttpUnauthorized, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(request.Context(), "session", session)
		handler.ServeHTTP(response, request.WithContext(ctx))
	})
}
