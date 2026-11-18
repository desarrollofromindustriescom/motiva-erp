export type LoansRoutes =
   | 'loanFunds'
   | 'createLoan'
   | 'approveLoan'
   | 'listLoans'
   | 'getLoan'
   | 'updateLoan'
   | 'loanPayments'
   | 'loanDeposits'
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

export interface LoanRow {
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
}

export interface LoansPage {
   items: LoanRow[];
   total: number;
   page: number;
   size: number;
}

export type LoanActionId = 'details' | 'payments' | 'edit' | 'pay';

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
}

export interface LoanDetail {
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
}

export type LoanDepositType = 'regular' | 'late' | 'capital';

/**
 * A payment made to a payment of a loan
 */
export interface LoanDeposit {
   id: string;
   date: string;
   type: LoanDepositType;
   amount: number;
}

export interface LoanDepositsPage {
   items: LoanDeposit[];
   total: number;
   // sum of all the payments made, not only the ones of the page
   sum: number;
   page: number;
   size: number;
}
