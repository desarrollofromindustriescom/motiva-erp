package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

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

	server := http.NewServeMux()
	apiPort := os.Getenv("API_PORT")
	serverPort := fmt.Sprintf(":%s", apiPort)

	framework.Router(server)

	if err := http.ListenAndServe(serverPort, middleware.MiddlewarePipeline(server)); err != nil {
		log.Printf("Error launching server: %v", err)
		return
	}
}