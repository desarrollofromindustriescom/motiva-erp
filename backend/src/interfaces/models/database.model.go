package models

import (
	"context"

	"github.com/jackc/pgx/v5/pgconn"
)

/**
 * Minimal executor satisfied by both the pool and a transaction
 */
type Executor interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}
