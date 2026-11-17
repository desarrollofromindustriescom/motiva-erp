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

/**
 * Page query for the users table. Empty filters aren't applied,
 * all of them can be combined. Order only applies to the CURP.
 */
type UsersQueryPayload struct {
	Page    int    `json:"page" validate:"required,gte=1"`
	Size    int    `json:"size" validate:"required,gte=1,lte=100"`
	Search  string `json:"search" validate:"omitempty,max=128"`
	Profile string `json:"profile" validate:"omitempty,oneof=superadmin administrator manager investor borrower"`
	Status  string `json:"status" validate:"omitempty,oneof=active inactive"`
	Order   string `json:"order" validate:"omitempty,oneof=asc desc"`
}

type UserStatusPreview struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
}

type UserRowPreview struct {
	ID        uuid.UUID          `json:"id"`
	CURP      *string            `json:"curp"`
	Username  string             `json:"username"`
	Fullname  string             `json:"fullname"`
	Profile   string             `json:"profile"`
	CreatedAt time.Time          `json:"created_at"`
	Status    *UserStatusPreview `json:"status"`
}

type UsersPagePreview struct {
	Items []*UserRowPreview `json:"items"`
	Total int               `json:"total"`
	Page  int               `json:"page"`
	Size  int               `json:"size"`
}

/**
 * Every stored field of a user (never the password), fields that
 * don't belong to the profile are null
 */
type UserDetailPreview struct {
	ID                   uuid.UUID          `json:"id"`
	Fullname             string             `json:"fullname"`
	Username             string             `json:"username"`
	Profile              string             `json:"profile"`
	PhoneNumber          *string            `json:"phone_number"`
	CURP                 *string            `json:"curp"`
	Address              *string            `json:"address"`
	GuaranteeFullname    *string            `json:"guarantee_fullname"`
	GuaranteePhoneNumber *string            `json:"guarantee_phone_number"`
	GuaranteeAddress     *string            `json:"guarantee_address"`
	AccountClabe         *string            `json:"account_clabe"`
	AccountBank          *string            `json:"account_bank"`
	CreatedAt            time.Time          `json:"created_at"`
	Status               *UserStatusPreview `json:"status"`
}

/**
 * Editable data of investors & borrowers. The name & the CURP can't
 * be changed (they aren't accepted), the profile decides what is required.
 */
type UpdateUserPayload struct {
	PhoneNumber          string `json:"phone_number" validate:"omitempty,phone"`
	Address              string `json:"address" validate:"omitempty,max=512"`
	WithGuarantee        bool   `json:"with_guarantee"`
	GuaranteeFullname    string `json:"guarantee_fullname" validate:"omitempty,max=256"`
	GuaranteePhoneNumber string `json:"guarantee_phone_number" validate:"omitempty,phone"`
	GuaranteeAddress     string `json:"guarantee_address" validate:"omitempty,max=512"`
	AccountClabe         string `json:"account_clabe" validate:"omitempty,clabe"`
	AccountBank          string `json:"account_bank" validate:"omitempty,max=128"`
}
