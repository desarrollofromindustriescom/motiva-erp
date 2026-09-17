package models

import (
	"time"

	"github.com/google/uuid"
)


type User struct {
	ID uuid.UUID
	Fullname string
	Username string
	Password string
	Profile string
	PhoneNumber *string
	CURP *string
	Address *string
	GuaranteeFullname *string
	GuaranteePhoneNumber *string
	GuaranteeAddress *string
	AccountClabe *string
	AccountBank *string
	CreatedAt time.Time
	Status Status
}