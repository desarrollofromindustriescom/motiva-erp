package controller

import "github.com/google/uuid"

type LoginPreview struct {
	Token string `json:"token"`
}

type LoginPayload struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type ValidatePreview struct {
	ID                   uuid.UUID `json:"id"`
	Fullname             string    `json:"fullname"`
	Username             string    `json:"username"`
	Profile              string    `json:"profile"`
	PhoneNumber          *string   `json:"phone_number"`
	CURP                 *string   `json:"curp"`
	Address              *string   `json:"address"`
	GuaranteeFullname    *string   `json:"guarantee_fullname"`
	GuaranteePhoneNumber *string   `json:"guarantee_phone_number"`
	GuaranteeAddress     *string   `json:"guarantee_address"`
	AccountClabe         *string   `json:"account_clabe"`
	AccountBank          *string   `json:"account_bank"`
}
