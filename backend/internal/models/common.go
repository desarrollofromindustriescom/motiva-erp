package models

type ErrorDetailsDTO struct {
	Field   string `json:"field"`
	Current any    `json:"current"`
}

type ErrorDetailDTO struct {
	Message string            `json:"message"`
	Details []ErrorDetailsDTO `json:"details"`
}

type ApiResponseDTO[T any] struct {
	Success bool            `json:"success"`
	Error   *ErrorDetailDTO `json:"error"`
	Data    *T              `json:"data"`
}
