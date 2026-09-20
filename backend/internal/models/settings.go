package models

import "github.com/google/uuid"

type Settings struct {
	ID     uuid.UUID
	Slug   string
	Value  int
	Unit   string
	Status Status
}

type SettingsItemDTO struct {
	Slug  string  `json:"slug"`
	Value float32 `json:"value"`
	Unit  string  `json:"unit"`
}

type ExtraValuesRequest struct {
	Mora  float64 `json:"mora"`
	Visit float64 `json:"visit"`
}

type AgreementValuesRequest struct {
	Weekly      float64 `json:"weekly"`
	WeeksBefore int     `json:"weeks_before"`
	WeeksAfter  int     `json:"weeks_after"`
}

type StandardSettingsRaw struct {
	Slug  string
	Value float64
	Unit  string
}

type StandardSettings struct {
	Slug  string
	Value int
	Unit  string
}
