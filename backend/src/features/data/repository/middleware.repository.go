package repository

import "time"

const (
	MwTimeoutDuration  time.Duration = 15 * time.Second
	MwExtendedTimeout  time.Duration = 1 * time.Minute
	MwDeadlineDuration time.Duration = MwTimeoutDuration + 30*time.Second
)
