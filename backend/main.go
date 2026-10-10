package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/log"
	"motiva-erp/backend/src/features/web/api/router"
	"motiva-erp/backend/src/features/web/utilities/middleware"
)

/**
 * Main api function
 * - Initialize global api settings (log, middleware, database)
 * - Close all db connections of pool on server stops
 * - Create new server object with env api port value
 * - Time configurations for server api endpoint steps
 * & wrap mux server with middleware pipeline
 */
func main() {
	log.SetStandardLogConfig()

	middleware.Init()

	if err := database.DBConnection(); err != nil {
		slog.Error("Error on db connection", "event", "main.DBCoonnection")
		return
	}

	defer database.GetPool().Close()

	mux := router.Router()
	port := os.Getenv("API_PORT")

	if port == "" {
		slog.Error("Environment vairable api is empty", "event", "main.osenvs")
		return
	}

	port = fmt.Sprintf(":%s", port)

	server := &http.Server{
		Addr:              port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Error launching server",
			"event", "main.ListenAndServe",
			"error", err,
		)

		return
	}
}
