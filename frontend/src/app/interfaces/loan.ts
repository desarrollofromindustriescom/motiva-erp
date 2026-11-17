export type LoansRoutes = 'loanFunds' | 'createLoan' | 'approveLoan' | 'listLoans' | 'getLoan';

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
 * What one place (the general cash balance or an investor) lent to a loan & what it has got back
 */
export interface LoanLender {
   // only investors have them
   fullname: string | null;
   username: string | null;
   lent: number;
   debt: number;
   paid_capital: number;
   paid_interest_investor: number;
   paid_interest_commission: number;
   current: number;
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
   borrower: { fullname: string; phone_number: string | null; curp: string | null; address: string | null };
   general: LoanLender | null;
   investors: LoanLender[];
}
