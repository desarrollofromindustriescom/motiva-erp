import { Status } from './status';

export type InvestmentsRoutes = 'cycles' | 'investments' | 'cancellations';

export interface CashCycle {
   id: string;
   reward_cycle: number;
   weight: number;
}

export interface Investment {
   id: string;
   folio: string;
   initial_amount: number;
   current_amount: number;
   current_reward: number;
   created_at: string;
   last_update: string;
   closed_at: string | null;
   reward_cycle: number;
   status: Status;
}

export interface InvestmentsPage {
   items: Investment[];
   total: number;
   page: number;
   size: number;
}

export interface FieldsInvestment {
   amount: number | null;
   cycle_id: string;
}

export interface FieldsCancellation {
   investments: string[];
   message: string;
}

export interface CancellationRequest {
   id: string;
   created_at: string;
   message: string;
   total_initial: number;
   total_recovered: number;
   total_reward: number;
   // what the general cash balance has & whether it covers the total requested
   general_available: number;
   can_approve: boolean;
   investments: Investment[];
}
