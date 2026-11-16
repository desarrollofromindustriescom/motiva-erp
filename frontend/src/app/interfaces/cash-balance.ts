export type CashBalanceRoutes = 'cashBalance';

export interface CashBalance {
   amount: number;
   last_update: string;
}

export interface CashBalanceLoader {
   balance: boolean;
}
