package database

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool = nil

func DBConnection() error {
	dbName := os.Getenv("POSTGRES_DB")
	dbUser := os.Getenv("POSTGRES_USER")
	dbPass := os.Getenv("POSTGRES_PASSWORD")
	dbPort := os.Getenv("DB_PORT")
	dbHost := os.Getenv("DB_HOST")

	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s", dbUser, dbPass, dbHost, dbPort, dbName)

	var err error
	pool, err = pgxpool.New(context.Background(), dbURL)

	if err != nil {
		log.Printf("Error connecting to DB: %v", err)
		return err
	}

	if err = pool.Ping(context.Background()); err != nil {
		log.Printf("Error verifying connection: %v", err)
		return err
	}
	
	return nil
}

func GetPool() *pgxpool.Pool {
	return pool
}