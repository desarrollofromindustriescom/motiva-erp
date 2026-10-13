package models

import (
	"time"

	"github.com/google/uuid"
)

type Session struct {
	ID          uuid.UUID
	Token       string
	TokenExp    time.Time
	DeviceAgent string
	LastLogin   time.Time
	CreatedAt   time.Time
	User        *User
	Status      *Status
}
