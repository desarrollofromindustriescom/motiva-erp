export type LoansRoutes =
   | 'loanFunds'
   | 'createLoan'
   | 'approveLoan'
   | 'listLoans'
   | 'loansExcel'
   | 'getLoan'
   | 'loanTicket'
   | 'updateLoan'
   | 'loanPayments'
   | 'loanDeposits'
   | 'answerLoanDeposit'
   | 'loanBreakdown'
   | 'addLoanVisit'
   | 'mySummary'
   | 'myLoans'
   | 'loansCalendar'
   | 'loansCalendarExcel'
   | 'agreementLoans'
   | 'createAgreement'
   | 'payLoanPayment';

export type LoanType = 'weekly' | 'monthly';

export interface FieldsLoan {
   borrower_id: string;
   amount: number | null;
   type: LoanType | '';
   no_payments: number | null;
}

export interface LoanInvestorFund {
   id: string;
   fullname: string;
   available: number;
}

/**
 * Interest (percentage over the amount) of some terms & what can be taken from each place
 */
export interface LoanFunds {
   rate: number;
   general_available: number;
   investors: LoanInvestorFund[];
}

export interface LoanQuote {
   total: number;
   payment: number;
}

// what the user chooses to take from one place
export interface LoanFundChoice {
   checked: boolean;
   amount: number | null;
}

export interface Loan {
   id: string;
   folio: string;
   amount: number;
   type: LoanType;
   no_payments: number;
   rate: number;
   total: number;
   payment_amount: number;
   status: string;
}

export type LoansOrder = 'asc' | 'desc' | '';

// filters as the sidebar gives them: ranges & lists are texts separated by comma, ex: "10,20" or "1,3,5"
export type LoansFilters = Record<string, string>;

export type LoanKind = 'loan' | 'agreement';

export interface LoanRow {
   // a loan or an agreement: both are listed together
   kind: LoanKind;
   id: string;
   folio: string;
   borrower: { id: string; fullname: string };
   status: { slug: string; title: string };
   type: LoanType;
   amount: number;
   total: number;
   rate: number;
   no_payments: number;
   created_at: string;
   // how the loan was handed over, null until it is registered
   payment: LoanPaymentMethod | null;
}

export interface LoansPage {
   items: LoanRow[];
   total: number;
   page: number;
   size: number;
}

export type LoanActionId = 'details' | 'ticket' | 'payments' | 'edit' | 'pay';

// how a loan was handed to the borrower: the receipt (an image) only exists for transfers
export type LoanPaymentMethod = 'cash' | 'transfer';

export interface FieldsLoanTicket {
   payment: LoanPaymentMethod;
}

/**
 * What one place (the general cash balance or an investor) lent to a loan & what has happened
 * with the payments made to it: its share of them (paid), what entered its balance (received)
 * & the commission (for an investor what was kept from its share, for the general cash balance
 * what it got from the shares of the investors)
 */
export interface LoanLender {
   // only investors have them
   fullname: string | null;
   username: string | null;
   lent: number;
   debt: number;
   paid: number;
   received: number;
   commission: number;
   // only the general cash balance: what it got over the base amount of the payments (mora & visits)
   extras: number;
}

/**
 * A loan of an agreement (it was cancelled when the agreement started) with what it owed
 */
export interface AgreementLoanRef {
   id: string;
   folio: string;
   debt: number;
}

export interface LoanDetail {
   kind: LoanKind;
   id: string;
   folio: string;
   status: { slug: string; title: string };
   rate: number;
   type: LoanType;
   no_payments: number;
   fulfilled_payments: number;
   request_date: string;
   resolution_date: string | null;
   amount: number;
   total: number;
   paid_capital: number;
   paid_interest: number;
   // what was paid over the base amount of the payments (mora & visits)
   paid_extras: number;
   current: number;
   borrower: {
      id: string;
      fullname: string;
      username: string;
      phone_number: string | null;
      curp: string | null;
      address: string | null;
   };
   general: LoanLender | null;
   investors: LoanLender[];
   // the loans an agreement was made of & the agreement a cancelled loan went to
   agreement_loans: AgreementLoanRef[];
   agreement: { id: string; folio: string } | null;
   // how the loan was handed over (null until it is registered) & if the image of its receipt was uploaded
   payment: LoanPaymentMethod | null;
   has_ticket: boolean;
}

export type LoanPaymentState = 'paid' | 'expired' | 'partial' | 'pending' | 'capital';

export interface LoanPayment {
   id: string;
   number: number;
   amount: number;
   paid: number;
   expected_date: string;
   // only the payments paid in full have it
   paid_date: string | null;
   state: LoanPaymentState;
   // the first payment that isn't paid in full: the only one that can receive a payment
   is_next: boolean;
}

export interface FieldsLoanPayment {
   amount: number | null;
   payment: LoanPaymentMethod;
}

export type LoanDepositStatus = 'pending' | 'aproved' | 'rejected';

export type LoanDepositType = 'regular' | 'late' | 'capital';

/**
 * A payment made to a payment of a loan
 */
export interface LoanDeposit {
   id: string;
   date: string;
   type: LoanDepositType;
   amount: number;
   // how it was paid (null in the payments made before it was asked) & if it has the image of the receipt
   payment: LoanPaymentMethod | null;
   has_ticket: boolean;
   // pending (reported by the borrower, it doesn't count as paid until it is accepted), aproved or rejected
   status: LoanDepositStatus;
}

export interface LoanDepositsPage {
   items: LoanDeposit[];
   total: number;
   // sum of all the payments made, not only the ones of the page
   sum: number;
   page: number;
   size: number;
}

/**
 * One kind of extra of a payment: how many there are, what each one costs (null when they
 * don't cost the same) & what they add up to
 */
export interface LoanExtra {
   quantity: number;
   unit: number | null;
   total: number;
}

/**
 * What a payment is made of: its original amount plus its extras (mora & visits)
 */
export interface LoanBreakdown {
   base: number;
   mora: LoanExtra | null;
   visits: LoanExtra | null;
   total: number;
}

/**
 * Next payment of the borrower: what it still owes & its day. The pay day is the weekday
 * (1 Monday ... 7 Sunday) on weekly loans & the day of the month on monthly ones.
 */
export interface NextPayment {
   amount: number;
   expected_date: string;
   pay_day_type: LoanType;
   pay_day: number;
}

/**
 * Panel of the borrower: what it owes, the payments it has left, its active loans & its next payment
 */
export interface BorrowerSummary {
   active_loans: number;
   total_debt: number;
   remaining_payments: number;
   next_payment: NextPayment | null;
}

/**
 * A loan in the calendar of payments: what its current payment still owes, what the whole loan owes,
 * its pay day (weekday on weekly loans, day of the month on monthly ones) & the borrower with its guarantee
 */
export interface CalendarItem {
   loan_id: string;
   folio: string;
   borrower: string;
   borrower_phone: string | null;
   guarantor: string | null;
   guarantor_phone: string | null;
   amount: number;
   total_debt: number;
   pay_day_type: LoanType;
   pay_day: number;
   expected_date: string;
   // the day of the current payment has passed
   overdue: boolean;
}

// the loans that have their current payment on a weekday (1 Monday ... 7 Sunday)
export interface CalendarDay {
   weekday: number;
   items: CalendarItem[];
}

/**
 * A loan of a borrower that can go to an agreement: its weeks of delay & what it owes
 */
export interface AgreementLoan {
   id: string;
   folio: string;
   weeks_late: number;
   debt: number;
}

export interface AgreementEligible {
   // percentage of the agreements, added to every payment
   rate: number;
   loans: AgreementLoan[];
}

export interface FieldsAgreement {
   borrower_id: string;
   weeks: number | null;
}

export interface AgreementQuote {
   // what each payment costs: its part of the debt plus the interest
   payment: number;
   total: number;
}
