package controller

type ErrorDetails struct {
	Field  string `json:"field"`
	Detail string `json:"detail"`
}

type EpError struct {
	Message string          `json:"message"`
	Details []*ErrorDetails `json:"details"`
}

type EpPreview[T any] struct {
	Success bool     `json:"success"`
	Error   *EpError `json:"error"`
	Data    *T       `json:"data"`
}
