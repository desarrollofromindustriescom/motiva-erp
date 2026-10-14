package controller

type LoginPreview struct {
	Token string `json:"token"`
}

type LoginPayload struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type ValidatePreview struct {
	Fullname string `json:"fullname"`
	Username string `json:"username"`
	Profile  string `json:"profile"`
}
