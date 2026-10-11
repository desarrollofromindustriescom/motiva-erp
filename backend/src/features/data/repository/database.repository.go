package repository

import "time"

const (
	DBConnectionStringTemplate string        = "postgres://%s:%s@%s/%s"
	DBMaxConns                 int32         = 20
	DBMinConns                 int32         = 0
	DBMaxConnLifetime          time.Duration = 30 * time.Second
	DBMaxConnIdleTime          time.Duration = 5 * time.Second
	DBHealthCheckPeriod        time.Duration = 1 * time.Second
	DBConnConfigTimeout        time.Duration = 10 * time.Second
	DBContextTimeout           time.Duration = 10 * time.Second
)
