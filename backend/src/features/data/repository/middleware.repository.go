package repository

import "time"

const (
	MwTimeoutDuration  time.Duration = 15 * time.Second
	MwDeadlineDuration time.Duration = MwTimeoutDuration + 30*time.Second
)
