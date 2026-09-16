package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	server := http.NewServeMux()
	apiPort := os.Getenv("API_PORT")
	serverPort := fmt.Sprintf(":%s", apiPort)	

	if err := http.ListenAndServe(serverPort, server); err != nil {
		log.Printf("Error launching server: %v", err)
		return
	}
}