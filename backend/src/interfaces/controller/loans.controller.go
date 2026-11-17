package controller

import (
	"time"

	"github.com/google/uuid"
)

/**
 * Money one investor lends to a loan, the system decides which of its
 * investments it is taken from
 */
type LoanInvestorFundPayload struct {
	InvestorID string  `json:"investor_id" validate:"required,uuid"`
	Amount     float64 `json:"amount" validate:"required,monetary"`
}

/**
 * Where the money of a loan comes from: the general cash balance (0 when it
 * isn't used) & the balances of the investors. Everything must add up to
 * the amount of the loan.
 */
type LoanFundsPayload struct {
	General   float64                    `json:"general" validate:"gte=0,lte=100000"`
	Investors []*LoanInvestorFundPayload `json:"investors" validate:"max=100,dive"`
}

/**
 * New loan. Without funds it is saved as pending, with them it is approved
 * (active) at once & the money is taken from the funds.
 */
type NewLoanPayload struct {
	BorrowerID string            `json:"borrower_id" validate:"required,uuid"`
	Amount     float64           `json:"amount" validate:"required,monetary"`
	Type       string            `json:"type" validate:"required,oneof=weekly monthly"`
	NoPayments int               `json:"no_payments" validate:"required,gte=1,lte=13"`
	Funds      *LoanFundsPayload `json:"funds" validate:"omitempty"`
}

/**
 * Funds to approve a pending loan
 */
type ApproveLoanPayload struct {
	Funds *LoanFundsPayload `json:"funds" validate:"required"`
}

/**
 * Terms to know the interest & the funds available for a loan
 */
type LoanFundsQueryPayload struct {
	Type       string `json:"type" validate:"required,oneof=weekly monthly"`
	NoPayments int    `json:"no_payments" validate:"required,gte=1,lte=13"`
}

type LoanInvestorFundPreview struct {
	ID        uuid.UUID `json:"id"`
	Fullname  string    `json:"fullname"`
	Available float64   `json:"available"`
}

/**
 * Interest (percentage over the amount) of the terms & what can be taken from
 * each place: the general cash balance & the investors (only the money of the
 * investments that close after the last payment of the loan)
 */
type LoanFundsPreview struct {
	Rate             float64                    `json:"rate"`
	GeneralAvailable float64                    `json:"general_available"`
	Investors        []*LoanInvestorFundPreview `json:"investors"`
}

type LoanPreview struct {
	ID         uuid.UUID `json:"id"`
	Folio      string    `json:"folio"`
	Amount     float64   `json:"amount"`
	Type       string    `json:"type"`
	NoPayments int       `json:"no_payments"`
	// percentage over the amount, what to pay & what each payment is
	Rate       float64 `json:"rate"`
	Total      float64 `json:"total"`
	PaymentAmt float64 `json:"payment_amount"`
	Status     string  `json:"status"`
}

/**
 * Page query of the loans table. Empty filters aren't applied & all of them
 * can be combined. Dates are days (YYYY-MM-DD), the interest is a percentage
 * & the amounts are in currency units. Order only applies to the folio.
 */
type LoansQueryPayload struct {
	Page        int      `json:"page" validate:"required,gte=1"`
	Size        int      `json:"size" validate:"required,gte=1,lte=100"`
	Search      string   `json:"search" validate:"omitempty,max=128"`
	Borrowers   []string `json:"borrowers" validate:"omitempty,max=100,dive,uuid"`
	IssueFrom   *string  `json:"issue_from" validate:"omitempty,datetime=2006-01-02"`
	IssueTo     *string  `json:"issue_to" validate:"omitempty,datetime=2006-01-02"`
	SettleFrom  *string  `json:"settle_from" validate:"omitempty,datetime=2006-01-02"`
	SettleTo    *string  `json:"settle_to" validate:"omitempty,datetime=2006-01-02"`
	RateMin     *float64 `json:"rate_min" validate:"omitempty,gte=0"`
	RateMax     *float64 `json:"rate_max" validate:"omitempty,gte=0"`
	PaymentsMin *int     `json:"payments_min" validate:"omitempty,gte=0"`
	PaymentsMax *int     `json:"payments_max" validate:"omitempty,gte=0"`
	WeeklyDays  []int    `json:"weekly_days" validate:"omitempty,max=7,dive,gte=1,lte=7"`
	MonthlyDays []int    `json:"monthly_days" validate:"omitempty,max=31,dive,gte=1,lte=31"`
	WithVisits  bool     `json:"with_visits"`
	WithMora    bool     `json:"with_mora"`
	Type        string   `json:"type" validate:"omitempty,oneof=weekly monthly"`
	Payments    []int    `json:"payments" validate:"omitempty,max=13,dive,gte=1,lte=13"`
	Statuses    []string `json:"statuses" validate:"omitempty,max=5,dive,oneof=pending active rejected finished expired"`
	AmountMin   *float64 `json:"amount_min" validate:"omitempty,gte=0"`
	AmountMax   *float64 `json:"amount_max" validate:"omitempty,gte=0"`
	TotalMin    *float64 `json:"total_min" validate:"omitempty,gte=0"`
	TotalMax    *float64 `json:"total_max" validate:"omitempty,gte=0"`
	Order       string   `json:"order" validate:"omitempty,oneof=asc desc"`
}

type LoanBorrowerPreview struct {
	ID       uuid.UUID `json:"id"`
	Fullname string    `json:"fullname"`
}

type LoanStatusPreview struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
}

type LoanRowPreview struct {
	ID         uuid.UUID            `json:"id"`
	Folio      string               `json:"folio"`
	Borrower   *LoanBorrowerPreview `json:"borrower"`
	Status     *LoanStatusPreview   `json:"status"`
	Type       string               `json:"type"`
	Amount     float64              `json:"amount"`
	Total      float64              `json:"total"`
	Rate       float64              `json:"rate"`
	NoPayments int                  `json:"no_payments"`
	CreatedAt  time.Time            `json:"created_at"`
}

type LoansPagePreview struct {
	Items []*LoanRowPreview `json:"items"`
	Total int               `json:"total"`
	Page  int               `json:"page"`
	Size  int               `json:"size"`
}

/**
 * What one place (the general cash balance or an investor) lent to a loan & how much of
 * the loan has been paid back to it. Everything is in currency units.
 */
type LoanLenderPreview struct {
	// only investors have them, the general cash balance has none
	Fullname *string `json:"fullname"`
	Username *string `json:"username"`
	Lent     float64 `json:"lent"`
	Debt     float64 `json:"debt"`
	// paid back without interest, & the interest split between the investor & the commission
	PaidCapital            float64 `json:"paid_capital"`
	PaidInterestInvestor   float64 `json:"paid_interest_investor"`
	PaidInterestCommission float64 `json:"paid_interest_commission"`
	Current                float64 `json:"current"`
}

type LoanBorrowerDetailPreview struct {
	ID          uuid.UUID `json:"id"`
	Fullname    string    `json:"fullname"`
	Username    string    `json:"username"`
	PhoneNumber *string   `json:"phone_number"`
	CURP        *string   `json:"curp"`
	Address     *string   `json:"address"`
}

type LoanDetailPreview struct {
	ID                uuid.UUID                  `json:"id"`
	Folio             string                     `json:"folio"`
	Status            *LoanStatusPreview         `json:"status"`
	Rate              float64                    `json:"rate"`
	Type              string                     `json:"type"`
	NoPayments        int                        `json:"no_payments"`
	FulfilledPayments int                        `json:"fulfilled_payments"`
	RequestDate       time.Time                  `json:"request_date"`
	ResolutionDate    *time.Time                 `json:"resolution_date"`
	Amount            float64                    `json:"amount"`
	Total             float64                    `json:"total"`
	PaidCapital       float64                    `json:"paid_capital"`
	PaidInterest      float64                    `json:"paid_interest"`
	Current           float64                    `json:"current"`
	Borrower          *LoanBorrowerDetailPreview `json:"borrower"`
	// the general cash balance when it lent money & every investor that did
	General   *LoanLenderPreview   `json:"general"`
	Investors []*LoanLenderPreview `json:"investors"`
}
