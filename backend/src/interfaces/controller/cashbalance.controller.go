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

/**
 * Cash balance of an investor with the data shown on its header,
 * amount is in currency units (stored in cents)
 */
type InvestorBalancePreview struct {
	Fullname   string    `json:"fullname"`
	Since      time.Time `json:"since"`
	Amount     float64   `json:"amount"`
	LastUpdate time.Time `json:"last_update"`
	// amount (currency units) not locked by the active investments
	Available float64 `json:"available"`
}

type NewInvestmentPayload struct {
	Amount  float64 `json:"amount" validate:"required,monetary"`
	CycleID string  `json:"cycle_id" validate:"required,uuid"`
}

type CashCyclePreview struct {
	ID          uuid.UUID `json:"id"`
	RewardCycle int       `json:"reward_cycle"`
	Weight      int       `json:"weight"`
}

type InvestmentPreview struct {
	ID            uuid.UUID              `json:"id"`
	Folio         string                 `json:"folio"`
	InitialAmount float64                `json:"initial_amount"`
	CurrentAmount float64                `json:"current_amount"`
	CurrentReward float64                `json:"current_reward"`
	CreatedAt     time.Time              `json:"created_at"`
	LastUpdate    time.Time              `json:"last_update"`
	ClosedAt      *time.Time             `json:"closed_at"`
	RewardCycle   int                    `json:"reward_cycle"`
	Status        *MovementStatusPreview `json:"status"`
}

type InvestmentsPagePreview struct {
	Items []*InvestmentPreview `json:"items"`
	Total int                  `json:"total"`
	Page  int                  `json:"page"`
	Size  int                  `json:"size"`
}
