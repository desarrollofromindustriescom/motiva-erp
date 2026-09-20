package framework

import (
	"motiva-erp/backend/internal/framework/handlers"
	"net/http"
)

func Router(server *http.ServeMux) {
	// server.HandleFunc("GET /hello", func(w http.ResponseWriter, r *http.Request) {
	// 	json.NewEncoder(w).Encode(r.URL.Path)
	// })
	server.HandleFunc("POST /api/login", handlers.Login)
	server.HandleFunc("GET /api/settings", handlers.GetSettings)
}
