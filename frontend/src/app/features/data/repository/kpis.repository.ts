// how often the panel asks for the kpis again while it is open, the api keeps them up to date
export const KPIS_REFRESH_MS: number = 60_000;

export const KPIS_I18N_KEYS = {
   MODULE_TITLE: 'KPIS_MODULE_TITLE',
   AMOUNT_LENT: 'KPIS_AMOUNT_LENT',
   AWAITING_PAYMENT: 'KPIS_AWAITING_PAYMENT',
   INVESTORS: 'KPIS_INVESTORS',
   BORROWERS: 'KPIS_BORROWERS',
   CHART_TITLE: 'KPIS_CHART_TITLE',
   CHART_SUBTITLE: 'KPIS_CHART_SUBTITLE',
   CHART_LOANS: 'KPIS_CHART_LOANS',
   CHART_AMOUNT: 'KPIS_CHART_AMOUNT',
   CHART_WEEK_OF: 'KPIS_CHART_WEEK_OF',
   CHART_LABEL: 'KPIS_CHART_LABEL',
   UPDATED: 'KPIS_UPDATED',
   ERROR: 'KPIS_ERROR',
   RETRY: 'KPIS_RETRY',
};

export type KpiCardValue = 'money' | 'count';

/**
 * The cards of the panel: the value they show, its icon & the color of the icon
 */
export const KPIS_CARDS: {
   id: 'amount_lent' | 'awaiting_payment' | 'investors' | 'borrowers';
   label: string;
   icon: string;
   type: KpiCardValue;
   accent: string;
}[] = [
   {
      id: 'amount_lent',
      label: KPIS_I18N_KEYS.AMOUNT_LENT,
      icon: 'bx-coin',
      type: 'money',
      accent: 'bg-second/10 text-second',
   },
   {
      id: 'awaiting_payment',
      label: KPIS_I18N_KEYS.AWAITING_PAYMENT,
      icon: 'bx-hourglass',
      type: 'money',
      accent: 'bg-main/10 text-main',
   },
   {
      id: 'investors',
      label: KPIS_I18N_KEYS.INVESTORS,
      icon: 'bx-trending-up',
      type: 'count',
      accent: 'bg-contrast/10 text-contrast',
   },
   {
      id: 'borrowers',
      label: KPIS_I18N_KEYS.BORROWERS,
      icon: 'bx-user',
      type: 'count',
      accent: 'bg-second-light/10 text-second-light',
   },
];
