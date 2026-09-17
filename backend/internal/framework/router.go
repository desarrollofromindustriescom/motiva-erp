package framework

import (
	"motiva-erp/backend/internal/framework/handlers"
	"net/http"
)

func Router(server *http.ServeMux) {
	server.HandleFunc("POST /api/login", handlers.Login)
}