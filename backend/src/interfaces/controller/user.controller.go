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

/**
 * Payload to create any user profile. Which fields are required
 * depends on the profile (checked in the handler), fields that
 * don't belong to the profile are ignored.
 */
type CreateUserPayload struct {
	Profile              string `json:"profile" validate:"required,oneof=administrator manager investor borrower"`
	Fullname             string `json:"fullname" validate:"required,min=3,max=128"`
	PhoneNumber          string `json:"phone_number" validate:"omitempty,phone"`
	CURP                 string `json:"curp" validate:"omitempty,curp"`
	Address              string `json:"address" validate:"omitempty,max=512"`
	WithGuarantee        bool   `json:"with_guarantee"`
	GuaranteeFullname    string `json:"guarantee_fullname" validate:"omitempty,max=256"`
	GuaranteePhoneNumber string `json:"guarantee_phone_number" validate:"omitempty,phone"`
	GuaranteeAddress     string `json:"guarantee_address" validate:"omitempty,max=512"`
	AccountClabe         string `json:"account_clabe" validate:"omitempty,clabe"`
	AccountBank          string `json:"account_bank" validate:"omitempty,max=128"`
}

/**
 * Credentials of the created user, the password is only
 * available in this response
 */
type CreatedUserPreview struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Password string    `json:"password"`
}
