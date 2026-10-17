package controller

type ChangePasswordPayload struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,securepassword"`
	ConfirmPassword string `json:"confirm_password" validate:"required,min=8,securepassword"`
}
