package controller

import (
	"time"

	"github.com/google/uuid"
)

type ChangePasswordPayload struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,securepassword"`
	ConfirmPassword string `json:"confirm_password" validate:"required,min=8,securepassword"`
}

type ActiveSessionPreview struct {
	ID         uuid.UUID `json:"id"`
	System     string    `json:"system"`
	Navigator  string    `json:"navigator"`
	Device     string    `json:"device"`
	FirstLogin time.Time `json:"first_login"`
	LastLogin  time.Time `json:"last_login"`
	Current    bool      `json:"current"`
}
