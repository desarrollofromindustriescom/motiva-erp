export type KpisRoutes = 'kpis';

/**
 * Loans made on one week (it starts on its Monday) & what they lent
 */
export interface KpiWeek {
   // YYYY-MM-DD
   week_start: string;
   loans: number;
   amount: number;
}

/**
 * Kpis of the dashboard, calculated & stored by the api (updated_at is when)
 */
export interface Kpis {
   amount_lent: number;
   awaiting_payment: number;
   investors: number;
   borrowers: number;
   // the last weeks, the current one last
   weeks: KpiWeek[];
   updated_at: string;
}
