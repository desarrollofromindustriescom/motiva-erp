package database

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool = nil

func DBConnection() error {
	dbName := os.Getenv("POSTGRES_DB")
	dbUser := os.Getenv("POSTGRES_USER")
	dbPass := os.Getenv("POSTGRES_PASSWORD")
	dbPort := os.Getenv("DB_PORT")
	dbHost := os.Getenv("DB_HOST")

	if dbName == "" || dbUser == "" || dbPass == "" || dbHost == "" {
		slog.Error("Environment vairables for db are empty", "event", "database.dbconnection.osenvs")
		return errors.New("Empty environment")
	}

	if dbPort != "" {
		dbHost = fmt.Sprintf("%s:%s", dbHost, dbPort)
	}

	dbURL := fmt.Sprintf("postgres://%s:%s@%s/%s", dbUser, dbPass, dbHost, dbName)

	config, err := pgxpool.ParseConfig(dbURL)

	if err != nil {
		slog.Error("Error createing db connection config",
			"event", "database.dbconnection.parseconfig",
			"error", err,
		)

		return err
	}

	config.MaxConns = 20
	config.MinConns = 0
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute
	config.ConnConfig.ConnectTimeout = 10 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)

	defer cancel()

	pool, err = pgxpool.NewWithConfig(ctx, config)

	if err != nil {
		slog.Error("Error creating connection pool",
			"event", "database.dbconnnection.newwithconfig",
			"error", err,
		)

		return err
	}

	if err = pool.Ping(ctx); err != nil {
		slog.Error("Error verifying db connection",
			"event", "database.dbconnnection.ping",
			"error", err,
		)

		return err
	}

	return nil
}

func GetPool() *pgxpool.Pool {
	return pool
}
