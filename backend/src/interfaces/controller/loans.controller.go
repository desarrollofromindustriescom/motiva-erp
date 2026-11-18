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
 * Filters of the loans table (also used for its Excel file). Empty filters aren't applied & all
 * of them can be combined. Dates are days (YYYY-MM-DD), the interest is a percentage & the
 * amounts are in currency units. Order only applies to the folio.
 */
type LoansFiltersPayload struct {
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
	Statuses    []string `json:"statuses" validate:"omitempty,max=6,dive,oneof=pending active rejected finished expired cancelled"`
	AmountMin   *float64 `json:"amount_min" validate:"omitempty,gte=0"`
	AmountMax   *float64 `json:"amount_max" validate:"omitempty,gte=0"`
	TotalMin    *float64 `json:"total_min" validate:"omitempty,gte=0"`
	TotalMax    *float64 `json:"total_max" validate:"omitempty,gte=0"`
	Order       string   `json:"order" validate:"omitempty,oneof=asc desc"`
}

/**
 * Page query of the loans table: a page with the filters above
 */
type LoansQueryPayload struct {
	Page int `json:"page" validate:"required,gte=1"`
	Size int `json:"size" validate:"required,gte=1,lte=100"`
	LoansFiltersPayload
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
	// loan or agreement
	Kind       string               `json:"kind"`
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
	// how the loan was handed over (cash or transfer), null until it is registered
	Payment *string `json:"payment"`
}

type LoansPagePreview struct {
	Items []*LoanRowPreview `json:"items"`
	Total int               `json:"total"`
	Page  int               `json:"page"`
	Size  int               `json:"size"`
}

/**
 * What one place (the general cash balance or an investor) lent to a loan & what has
 * happened with the payments made to it. Everything is in currency units.
 * - paid: its share of what the borrower has paid (proportional to what it lent)
 * - an investor: received is what went to its balance & commission what was kept from its share
 * - the general cash balance: commission is what it got from the shares of the investors &
 *   received is everything that went to its balance (its own share plus that commission)
 */
type LoanLenderPreview struct {
	// only investors have them, the general cash balance has none
	Fullname   *string `json:"fullname"`
	Username   *string `json:"username"`
	Lent       float64 `json:"lent"`
	Debt       float64 `json:"debt"`
	Paid       float64 `json:"paid"`
	Received   float64 `json:"received"`
	Commission float64 `json:"commission"`
	// only the general cash balance: what it got over the base amount of the payments (mora & visits)
	Extras float64 `json:"extras"`
}

type LoanBorrowerDetailPreview struct {
	ID          uuid.UUID `json:"id"`
	Fullname    string    `json:"fullname"`
	Username    string    `json:"username"`
	PhoneNumber *string   `json:"phone_number"`
	CURP        *string   `json:"curp"`
	Address     *string   `json:"address"`
}

/**
 * A loan that belongs to an agreement (it was cancelled when the agreement started) & what it owed
 */
type AgreementLoanRefPreview struct {
	ID    uuid.UUID `json:"id"`
	Folio string    `json:"folio"`
	Debt  float64   `json:"debt"`
}

type AgreementRefPreview struct {
	ID    uuid.UUID `json:"id"`
	Folio string    `json:"folio"`
}

type LoanDetailPreview struct {
	// loan or agreement: an agreement has the loans it was made of & no lenders
	Kind              string             `json:"kind"`
	ID                uuid.UUID          `json:"id"`
	Folio             string             `json:"folio"`
	Status            *LoanStatusPreview `json:"status"`
	Rate              float64            `json:"rate"`
	Type              string             `json:"type"`
	NoPayments        int                `json:"no_payments"`
	FulfilledPayments int                `json:"fulfilled_payments"`
	RequestDate       time.Time          `json:"request_date"`
	ResolutionDate    *time.Time         `json:"resolution_date"`
	Amount            float64            `json:"amount"`
	Total             float64            `json:"total"`
	PaidCapital       float64            `json:"paid_capital"`
	PaidInterest      float64            `json:"paid_interest"`
	// what was paid over the base amount of the payments (mora & visits)
	PaidExtras float64                    `json:"paid_extras"`
	Current    float64                    `json:"current"`
	Borrower   *LoanBorrowerDetailPreview `json:"borrower"`
	// the general cash balance when it lent money & every investor that did
	General   *LoanLenderPreview   `json:"general"`
	Investors []*LoanLenderPreview `json:"investors"`
	// the loans of an agreement, & the agreement a cancelled loan went to
	AgreementLoans []*AgreementLoanRefPreview `json:"agreement_loans"`
	Agreement      *AgreementRefPreview       `json:"agreement"`
	// how the loan was handed over (cash or transfer, null until it is registered) & if it has the image of the receipt
	Payment   *string `json:"payment"`
	HasTicket bool    `json:"has_ticket"`
}

/**
 * One payment of a loan. The state follows what has been paid:
 * - paid: paid in full (on time or late)
 * - capital: paid in full with money paid to capital, to reduce the number of payments
 * - partial: something was paid but not all of it
 * - expired: its day has passed & nothing was paid
 * - pending: the rest (the next one & the ones to come)
 * Only the paid & capital ones have a payment date.
 */
type LoanPaymentPreview struct {
	ID           uuid.UUID  `json:"id"`
	Number       int        `json:"number"`
	Amount       float64    `json:"amount"`
	Paid         float64    `json:"paid"`
	ExpectedDate time.Time  `json:"expected_date"`
	PaidDate     *time.Time `json:"paid_date"`
	State        string     `json:"state"`
	// the first payment that isn't paid in full: the only one that can receive a payment
	IsNext bool `json:"is_next"`
}

/**
 * A payment made to a payment of a loan: regular (on time), late or capital
 */
type LoanDepositPreview struct {
	ID     uuid.UUID `json:"id"`
	Date   time.Time `json:"date"`
	Type   string    `json:"type"`
	Amount float64   `json:"amount"`
	// how it was paid (cash or transfer, null in the ones made before it was asked) & if it has the image of the receipt
	Payment   *string `json:"payment"`
	HasTicket bool    `json:"has_ticket"`
	// pending (reported by the borrower, doesn't count as paid), aproved or rejected
	Status string `json:"status"`
}

type LoanDepositsPagePreview struct {
	Items []*LoanDepositPreview `json:"items"`
	Total int                   `json:"total"`
	// sum of all the payments made, not only the ones of the page
	Sum  float64 `json:"sum"`
	Page int     `json:"page"`
	Size int     `json:"size"`
}

type LoanDepositsQueryPayload struct {
	Page int `json:"page" validate:"required,gte=1"`
	Size int `json:"size" validate:"required,gte=1,lte=100"`
}

/**
 * One kind of extra of a payment: how many there are, what each one costs (null when they
 * don't cost the same, ex: the percentage changed) & what they add up to
 */
type LoanExtraPreview struct {
	Quantity int      `json:"quantity"`
	Unit     *float64 `json:"unit"`
	Total    float64  `json:"total"`
}

/**
 * What a payment is made of: its original amount plus its extras (one mora for every
 * week of delay & the visits that were made)
 */
type LoanBreakdownPreview struct {
	Base   float64           `json:"base"`
	Mora   *LoanExtraPreview `json:"mora"`
	Visits *LoanExtraPreview `json:"visits"`
	Total  float64           `json:"total"`
}

/**
 * Page query of the loans of the borrower that is logged in
 */
type MyLoansQueryPayload struct {
	Page  int    `json:"page" validate:"required,gte=1"`
	Size  int    `json:"size" validate:"required,gte=1,lte=100"`
	Order string `json:"order" validate:"omitempty,oneof=asc desc"`
}

/**
 * The next payment of a borrower: what it still owes & its day. The pay day is the weekday
 * (1 Monday ... 7 Sunday) on weekly loans & the day of the month on monthly ones.
 */
type NextPaymentPreview struct {
	Amount       float64   `json:"amount"`
	ExpectedDate time.Time `json:"expected_date"`
	PayDayType   string    `json:"pay_day_type"`
	PayDay       int       `json:"pay_day"`
}

/**
 * Panel of the borrower: what it owes in total, the payments it has left, its active
 * loans & its next payment (none when it doesn't owe anything)
 */
type BorrowerSummaryPreview struct {
	ActiveLoans       int                 `json:"active_loans"`
	TotalDebt         float64             `json:"total_debt"`
	RemainingPayments int                 `json:"remaining_payments"`
	NextPayment       *NextPaymentPreview `json:"next_payment"`
}

/**
 * A loan in the calendar of payments: what its current payment still owes, what the whole loan
 * owes, its pay day (the weekday on weekly loans, the day of the month on monthly ones) & the
 * borrower with its guarantee. Overdue is true when the day of the current payment has passed.
 */
type CalendarItemPreview struct {
	LoanID         uuid.UUID `json:"loan_id"`
	Folio          string    `json:"folio"`
	Borrower       string    `json:"borrower"`
	BorrowerPhone  *string   `json:"borrower_phone"`
	Guarantor      *string   `json:"guarantor"`
	GuarantorPhone *string   `json:"guarantor_phone"`
	Amount         float64   `json:"amount"`
	TotalDebt      float64   `json:"total_debt"`
	PayDayType     string    `json:"pay_day_type"`
	PayDay         int       `json:"pay_day"`
	ExpectedDate   time.Time `json:"expected_date"`
	Overdue        bool      `json:"overdue"`
}

/**
 * The loans that have their current payment on a weekday (1 Monday ... 7 Sunday)
 */
type CalendarDayPreview struct {
	Weekday int                    `json:"weekday"`
	Items   []*CalendarItemPreview `json:"items"`
}

/**
 * Terms to see the loans of a borrower that can go to an agreement
 */
type AgreementLoansQueryPayload struct {
	BorrowerID string `json:"borrower_id" validate:"required,uuid"`
}

/**
 * New agreement: the loans that go into it (they are cancelled), & the weeks it lasts. Its debt is
 * what those loans owe; the interest is the percentage of agreements of the settings.
 */
type NewAgreementPayload struct {
	BorrowerID string   `json:"borrower_id" validate:"required,uuid"`
	LoanIDs    []string `json:"loan_ids" validate:"required,min=1,max=50,dive,uuid"`
	Weeks      int      `json:"weeks" validate:"required,gte=25,lte=100"`
}

type AgreementLoanPreview struct {
	ID    uuid.UUID `json:"id"`
	Folio string    `json:"folio"`
	// weeks of delay of its oldest payment that isn't paid
	WeeksLate int     `json:"weeks_late"`
	Debt      float64 `json:"debt"`
}

/**
 * The loans a borrower can take to an agreement & the percentage of the agreements
 */
type AgreementEligiblePreview struct {
	Rate  float64                 `json:"rate"`
	Loans []*AgreementLoanPreview `json:"loans"`
}

type AgreementPreview struct {
	ID            uuid.UUID `json:"id"`
	Folio         string    `json:"folio"`
	Debt          float64   `json:"debt"`
	Weeks         int       `json:"weeks"`
	Rate          float64   `json:"rate"`
	PaymentAmount float64   `json:"payment_amount"`
	Total         float64   `json:"total"`
}
