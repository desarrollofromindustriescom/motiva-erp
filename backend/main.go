package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/log"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/api/router"
	"motiva-erp/backend/src/features/web/utilities/i18n"
	"motiva-erp/backend/src/features/web/utilities/middleware"
	"motiva-erp/backend/src/features/web/utilities/validation"
)

/**
 * Helper to initialize global api settings (log,
 * middleware, i18n, validation, database)
 */
func initUtilities() error {
	log.SetStandardLogConfig()

	middleware.Init()

	if err := i18n.Init(); err != nil {
		slog.Error("Error initializing i18n utility", "event", "main.initUtilities.Init")
		return err
	}

	if err := validation.Init(); err != nil {
		slog.Error("Error initializing validation utility", "event", "main.initUtilities.Init")
		return err
	}

	if err := database.DBConnection(); err != nil {
		slog.Error("Error on db connection", "event", "main.initUtilities.DBCoonnection")
		return err
	}

	return nil
}

/**
 * Main api function
 * - Close all db connections of pool on server stops
 * - Create new server object with env api port value
 * - Time configurations for server api endpoint steps
 * & wrap mux server with middleware pipeline
 */
func main() {
	if err := initUtilities(); err != nil {
		slog.Error("Error intializing api utilities",
			"event", "main.main.initUtilities",
			"error", err,
		)

		return
	}

	defer database.GetPool().Close()

	mux := router.Router()
	port := os.Getenv(repository.EnvApiPort)

	if port == "" {
		slog.Error("Environment api variable is empty",
			"event", "main.main.osenvs",
			"port", port,
		)

		return
	}

	port = fmt.Sprintf(":%s", port)

	server := &http.Server{
		Addr:              port,
		Handler:           mux,
		ReadHeaderTimeout: repository.SvrReadHeaderTimeout,
		ReadTimeout:       repository.SvrReadTimeout,
		WriteTimeout:      repository.SvrWriteTimeout,
		IdleTimeout:       repository.SvrIdleTimeout,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Error launching server",
			"event", "main.main.ListenAndServe",
			"error", err,
		)

		return
	}
}
