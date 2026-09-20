package models

import "github.com/google/uuid"

type Settings struct {
	ID     uuid.UUID
	Title  string
	Slug   string
	Value  int
	Unit   string
	Status Status
}

type SettingsItemDTO struct {
	Title string  `json:"title"`
	Slug  string  `json:"slug"`
	Value float32 `json:"value"`
	Unit  string  `json:"unit"`
}
