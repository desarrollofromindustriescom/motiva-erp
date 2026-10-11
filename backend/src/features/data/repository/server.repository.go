package repository

import "time"

const (
	SvrReadHeaderTimeout time.Duration = 5 * time.Second
	SvrReadTimeout       time.Duration = 15 * time.Second
	SvrWriteTimeout      time.Duration = MwTimeoutDuration + 5*time.Second
	SvrIdleTimeout       time.Duration = 60 * time.Second
)
