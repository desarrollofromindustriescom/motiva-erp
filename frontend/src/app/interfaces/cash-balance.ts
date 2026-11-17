import { SignalForm } from './alias';
import { UserProfile } from './user';

export type CashBalanceRoutes = 'cashBalance' | 'deposit' | 'withdraw' | 'movements';

export type CashMovement = 'deposit' | 'withdraw';

export interface CashBalance {
   amount: number;
   last_update: string;
}

export interface InvestorBalance {
   fullname: string;
   since: string;
   amount: number;
   last_update: string;
   // amount not locked by the active investments
   available: number;
   // a cancellation request needs at least 1 active investment & none pending
   active_investments: number;
   pending_cancellation: boolean;
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

export type MovementType = 'deposit' | 'withdrawal';

export interface MovementStatus {
   slug: string;
   title: string;
}

export interface MovementUser {
   fullname: string;
   username: string;
   profile: UserProfile;
}

export interface Movement {
   id: string;
   folio: string;
   amount: number;
   type: MovementType;
   created_at: string;
   status: MovementStatus;
   user: MovementUser;
}

export interface MovementsPage {
   items: Movement[];
   total: number;
   page: number;
   size: number;
}

export interface MovementsQuery {
   page: number;
   size: number;
}
