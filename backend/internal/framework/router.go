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
	server.HandleFunc("GET /api/validation", handlers.Validation)
	server.HandleFunc("GET /api/settings", handlers.GetSettings)
	server.HandleFunc("PUT /api/settings/extra-values", handlers.SetExtraValues)
	server.HandleFunc("PUT /api/settings/agreement-values", handlers.SetAgreementValues)
	server.HandleFunc("PUT /api/settings/monthly-values", handlers.SetMonthlyValues)
	server.HandleFunc("PUT /api/settings/weekly-values", handlers.SetWeeklyValues)
}
