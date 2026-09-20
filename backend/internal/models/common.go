package models

type ErrorDetailDTO struct {
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details"`
}

type ApiResponseDTO[T interface{}] struct {
	Success bool            `json:"success"`
	Error   *ErrorDetailDTO `json:"error"`
	Data    *T              `json:"data"`
}
