package models

type ValidationErrorDetail struct {
	Field string
	Tag   string
	Param string
}

type FormDataContent struct {
	Values map[string]bool
	Files  map[string]bool
}
