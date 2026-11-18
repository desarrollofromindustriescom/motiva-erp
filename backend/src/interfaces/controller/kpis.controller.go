package controller

import "time"

/**
 * Loans made on one week (it starts on its Monday) & what they lent, amount in currency units
 */
type KpiWeekPreview struct {
	WeekStart string  `json:"week_start"`
	Loans     int     `json:"loans"`
	Amount    float64 `json:"amount"`
}

/**
 * Kpis of the dashboard, calculated before & stored (UpdatedAt is when). Money in currency units.
 * The weeks are the last ones with the current as the last, the ones without loans have zeros.
 */
type KpisPreview struct {
	AmountLent      float64 `json:"amount_lent"`
	AwaitingPayment float64 `json:"awaiting_payment"`
	Investors       int     `json:"investors"`
	Borrowers       int     `json:"borrowers"`
	// interest collected over the capital lent, in percentage
	CapitalYield float64           `json:"capital_yield"`
	Weeks        []*KpiWeekPreview `json:"weeks"`
	UpdatedAt    time.Time         `json:"updated_at"`
}
