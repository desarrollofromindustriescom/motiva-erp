package repository

import (
	"errors"
	"time"

	"golang.org/x/time/rate"
)

const (
	MwTimeoutDuration  time.Duration = 15 * time.Second
	MwExtendedTimeout  time.Duration = 1 * time.Minute
	MwDeadlineDuration time.Duration = MwTimeoutDuration + 30*time.Second
	MwTrustedProxies   int           = 3
	MwMaxRatePerSecond rate.Limit    = 5
	MwMaxRateBurst     int           = 5
	MwBannDuration     time.Duration = 5 * time.Minute
	MwLastIdle         time.Duration = 15 * time.Minute
	MwMaxClients       int           = 10_000
)

var (
	MwErrInvalidProxies    error = errors.New("Invalid proxies values")
	MwErrUndefinedClientIP error = errors.New("Undefined client ip")
	MwErrProxiesLength     error = errors.New("Proxies length")
)
