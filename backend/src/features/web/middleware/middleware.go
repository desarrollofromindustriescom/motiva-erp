package middleware

import "net/http"

func Pipeline(handler http.Handler) http.Handler {
	return handler
}
