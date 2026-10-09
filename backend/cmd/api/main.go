package main

import (
	"fmt"
	"log/slog"
	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/log"
	"motiva-erp/backend/src/features/web/middleware"
	"net/http"
	"os"
	"time"
)

func main() {
	log.SetStandardLogConfig()

	err := database.DBConnection()

	if err != nil {
		slog.Error("Error on db connection", "event", "main.dbcoonnection")
		return
	}

	defer database.GetPool().Close()

	mux := http.NewServeMux()
	apiPort := os.Getenv("API_PORT")

	if apiPort == "" {
		slog.Error("Environment vairable api is empty", "event", "main.osenvs")
		return
	}

	serverPort := fmt.Sprintf(":%s", apiPort)

	// framework.Router(mux)

	server := &http.Server{
		Addr:              serverPort,
		Handler:           middleware.Pipeline(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Error launching server",
			"event", "main.listenandserve",
			"error", err,
		)

		return
	}
}
