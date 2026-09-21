package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"motiva-erp/backend/internal/core/database"
	"motiva-erp/backend/internal/core/middleware"
	"motiva-erp/backend/internal/framework"
)

func main() {
	err := database.DBConnection()

	if err != nil {
		log.Print("Error on database package")
		return
	}

	defer database.GetPool().Close()

	mux := http.NewServeMux()
	apiPort := os.Getenv("API_PORT")
	serverPort := fmt.Sprintf(":%s", apiPort)

	framework.Router(mux)

	server := &http.Server{
		Addr:         serverPort,
		Handler:      middleware.MiddlewarePipeline(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("Error launching server: %v", err)
		return
	}
}
