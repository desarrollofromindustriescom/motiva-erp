package models

import (
	"time"

	"golang.org/x/time/rate"
)

type MiddlewareConfig struct {
	Timeout time.Duration
}

type ClientLimiter struct {
	Limiter     *rate.Limiter
	LastConnAt  time.Time
	BannedUntil time.Time
}
