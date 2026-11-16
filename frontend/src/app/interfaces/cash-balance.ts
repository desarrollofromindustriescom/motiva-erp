import { SignalForm } from './alias';

export type CashBalanceRoutes = 'cashBalance' | 'deposit' | 'withdraw';

export type CashMovement = 'deposit' | 'withdraw';

export interface CashBalance {
   amount: number;
   last_update: string;
}

export interface CashBalanceLoader {
   balance: boolean;
   deposit: boolean;
   withdraw: boolean;
}

export interface FieldsCashMovement {
   amount: number | null;
}

export interface CashBalanceForms {
   deposit: SignalForm<FieldsCashMovement>;
   withdraw: SignalForm<FieldsCashMovement>;
}
