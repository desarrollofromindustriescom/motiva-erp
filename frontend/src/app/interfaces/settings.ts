import { SignalForm } from './alias';

export type SettingsRoutes =
   'settings' | 'updateExtras' | 'updateAgreements' | 'updateMonthly' | 'updateBiweekly' | 'updateWeekly';

export type SettingsGroup = 'extras' | 'agreements' | 'monthly' | 'biweekly' | 'weekly';

export type SettingUnit = 'percentage' | 'monetary' | 'weeks';

export type SettingRatePeriod = 'month' | 'fortnight' | 'week';

export interface Setting {
   slug: string;
   value: number;
   unit: SettingUnit;
}

export interface SettingConceptRow {
   concept: string;
   setting: Setting | null;
}

export interface SettingRateRow {
   period: number;
   investor: Setting | null;
   general: Setting | null;
}

export interface SettingsLoader {
   settings: boolean;
   extras: boolean;
   agreements: boolean;
   monthly: boolean;
   biweekly: boolean;
   weekly: boolean;
}

export interface FieldsExtras {
   mora: number | null;
   visit: number | null;
}

export interface FieldsAgreements {
   weekly: number | null;
   weeks_before: number | null;
   weeks_after: number | null;
}

export interface FieldsRates {
   investor: (number | null)[];
   general: (number | null)[];
}

export interface SettingsForms {
   extras: SignalForm<FieldsExtras>;
   agreements: SignalForm<FieldsAgreements>;
   monthly: SignalForm<FieldsRates>;
   biweekly: SignalForm<FieldsRates>;
   weekly: SignalForm<FieldsRates>;
}
