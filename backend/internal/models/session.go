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
	User        User
	Status      Status
}

type LoginDTO struct {
	Fullname string `json:"fullname"`
	Username string `json:"username"`
	Profile  string `json:"profile"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
