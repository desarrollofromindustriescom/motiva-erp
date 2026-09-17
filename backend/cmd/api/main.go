package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"motiva-erp/backend/internal/application/database"
	"motiva-erp/backend/internal/framework/middleware"
)

func main() {
	err := database.DBConnection()

	if err != nil {
		log.Print("Error on database package")
		return
	}

	server := http.NewServeMux()
	apiPort := os.Getenv("API_PORT")
	serverPort := fmt.Sprintf(":%s", apiPort)	

	if err := http.ListenAndServe(serverPort, middleware.MiddlewarePipeline(server)); err != nil {
		log.Printf("Error launching server: %v", err)
		return
	}
}