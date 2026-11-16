package controller

import "time"

type CashBalancePreview struct {
	Amount     float64   `json:"amount"`
	LastUpdate time.Time `json:"last_update"`
}
