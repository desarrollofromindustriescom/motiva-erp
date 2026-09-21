package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool = nil

func DBConnection() error {
	var dbLink string

	dbName := os.Getenv("POSTGRES_DB")
	dbUser := os.Getenv("POSTGRES_USER")
	dbPass := os.Getenv("POSTGRES_PASSWORD")
	dbPort := os.Getenv("DB_PORT")
	dbHost := os.Getenv("DB_HOST")

	if dbPort == "" {
		dbLink = dbHost
	} else {
		dbLink = fmt.Sprintf("%s:%s", dbHost, dbPort)
	}

	dbURL := fmt.Sprintf("postgres://%s:%s@%s/%s", dbUser, dbPass, dbLink, dbName)

	config, err := pgxpool.ParseConfig(dbURL)

	if err != nil {
		return err
	}

	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err = pgxpool.NewWithConfig(ctx, config)

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
