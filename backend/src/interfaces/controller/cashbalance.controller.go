package controller

import (
	"time"

	"github.com/google/uuid"
)

type CashBalancePreview struct {
	Amount     float64   `json:"amount"`
	LastUpdate time.Time `json:"last_update"`
}

type CashBalanceMovementPayload struct {
	Amount float64 `json:"amount" validate:"required,monetary"`
}

type MovementsQueryPayload struct {
	Page int `json:"page" validate:"required,gte=1"`
	Size int `json:"size" validate:"required,gte=1,lte=100"`
}

type MovementStatusPreview struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
}

type MovementUserPreview struct {
	Fullname string `json:"fullname"`
	Username string `json:"username"`
	Profile  string `json:"profile"`
}

type MovementPreview struct {
	ID        uuid.UUID              `json:"id"`
	Folio     string                 `json:"folio"`
	Amount    float64                `json:"amount"`
	Type      string                 `json:"type"`
	CreatedAt time.Time              `json:"created_at"`
	Status    *MovementStatusPreview `json:"status"`
	User      *MovementUserPreview   `json:"user"`
}

type MovementsPagePreview struct {
	Items []*MovementPreview `json:"items"`
	Total int                `json:"total"`
	Page  int                `json:"page"`
	Size  int                `json:"size"`
}
