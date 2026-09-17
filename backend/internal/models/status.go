package models

import "github.com/google/uuid"

type Status struct {
	ID uuid.UUID
	Slug string
	Title string
}