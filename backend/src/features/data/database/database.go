package database

import (
	"context"
	"fmt"
	"log/slog"
	"motiva-erp/backend/src/features/data/repository"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool = nil

/**
 * Main package function to start db connection
 * - Get data environment and verify it
 * - create connection string
 * - Setup connection configuration for connections and timeouts
 * - Create pool and make first ping connection
 */
func DBConnection() error {
	if pool != nil {
		return nil
	}

	dbName := os.Getenv(repository.EnvDBName)
	dbUser := os.Getenv(repository.EnvDBUser)
	dbPass := os.Getenv(repository.EnvDBPass)
	dbPort := os.Getenv(repository.EnvDBPort)
	dbHost := os.Getenv(repository.EnvDBHost)

	if dbName == "" || dbUser == "" || dbPass == "" || dbHost == "" {
		slog.Error("Environment vairables for db are empty",
			"event", "database.DBConnection.osenvs",
			"name", dbName == "",
			"user", dbUser == "",
			"pass", dbPass == "",
			"port", dbPort == "",
			"host", dbHost == "",
		)

		return repository.DBErrEmptyEnv
	}

	env := os.Getenv(repository.EnvEnv)

	if env == repository.EnvValDevelopment {
		if dbPort == "" {
			slog.Error("DB port is empty",
				"event", "database.DBConnection.dbPort",
				"port", dbPort,
			)

			return repository.DBErrPortMissing
		}

		dbHost = fmt.Sprintf("%s:%s", dbHost, dbPort)
	}

	dbURL := fmt.Sprintf(repository.DBConnectionStringTemplate, dbUser, dbPass, dbHost, dbName)

	config, err := pgxpool.ParseConfig(dbURL)

	if err != nil {
		slog.Error("Error createing db connection config",
			"event", "database.DBConnection.ParseConfig",
		)

		return err
	}

	config.MaxConns = repository.DBMaxConns
	config.MinConns = repository.DBMinConns
	config.MaxConnLifetime = repository.DBMaxConnLifetime
	config.MaxConnIdleTime = repository.DBMaxConnIdleTime
	config.HealthCheckPeriod = repository.DBHealthCheckPeriod
	config.ConnConfig.ConnectTimeout = repository.DBConnConfigTimeout

	// the timestamp columns have no timezone & hold the wall clock of the business (TZ of the container), so they are read
	// in that same location instead of UTC, which would send them to the client as another instant (and day)
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		conn.TypeMap().RegisterType(&pgtype.Type{
			Name:  "timestamp",
			OID:   pgtype.TimestampOID,
			Codec: &pgtype.TimestampCodec{ScanLocation: time.Local},
		})

		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), repository.DBContextTimeout)

	defer cancel()

	pool, err = pgxpool.NewWithConfig(ctx, config)

	if err != nil {
		slog.Error("Error creating connection pool",
			"event", "database.DBConnection.NewWithConfig",
			"timeout", repository.DBContextTimeout,
		)

		return err
	}

	if err = pool.Ping(ctx); err != nil {
		slog.Error("Error verifying db connection",
			"event", "database.DBConnection.Ping",
		)

		return err
	}

	return nil
}

/**
 * Access function to get db pool
 */
func GetPool() *pgxpool.Pool {
	return pool
}
