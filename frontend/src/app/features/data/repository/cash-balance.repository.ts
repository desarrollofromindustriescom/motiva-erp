import { MovementType } from '../../../interfaces/cash-balance';

export type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

export const MOVEMENTS_PAGE_SIZE: number = 10;

export const MOVEMENTS_I18N_KEYS = {
   HEAD_FOLIO: 'MOVEMENTS_HEAD_FOLIO',
   HEAD_AMOUNT: 'MOVEMENTS_HEAD_AMOUNT',
   HEAD_DATE: 'MOVEMENTS_HEAD_DATE',
   HEAD_TYPE: 'MOVEMENTS_HEAD_TYPE',
   HEAD_STATUS: 'MOVEMENTS_HEAD_STATUS',
   BUTTON_DETAILS: 'MOVEMENTS_BUTTON_DETAILS',
   DETAIL_FOLIO: 'MOVEMENTS_DETAIL_FOLIO',
   DETAIL_AMOUNT: 'MOVEMENTS_DETAIL_AMOUNT',
   DETAIL_DATE: 'MOVEMENTS_DETAIL_DATE',
   DETAIL_TYPE: 'MOVEMENTS_DETAIL_TYPE',
   DETAIL_STATUS: 'MOVEMENTS_DETAIL_STATUS',
   EXECUTOR_TITLE: 'MOVEMENTS_EXECUTOR_TITLE',
   EXECUTOR_FULLNAME: 'MOVEMENTS_EXECUTOR_FULLNAME',
   EXECUTOR_USERNAME: 'MOVEMENTS_EXECUTOR_USERNAME',
   EXECUTOR_PROFILE: 'MOVEMENTS_EXECUTOR_PROFILE',
   EMPTY: 'MOVEMENTS_EMPTY',
};

export const MOVEMENT_TYPE_I18N_KEYS: Record<MovementType, string> = {
   deposit: 'MOVEMENTS_TYPE_DEPOSIT',
   withdrawal: 'MOVEMENTS_TYPE_WITHDRAWAL',
};

export const MOVEMENT_TYPE_SEVERITY: Record<MovementType, TagSeverity> = {
   deposit: 'success',
   withdrawal: 'danger',
};

export const STATUS_SEVERITY: Record<string, TagSeverity> = {
   executed: 'success',
   aproved: 'success',
   pending: 'warn',
   rejected: 'danger',
   revoked: 'danger',
   inactive: 'secondary',
   deprecated: 'secondary',
};

/**
 * Compact folio for tables: prefix and the number without the zero
 * padding used to complete the 32 characters (MV-0000...0012 => MV-00012)
 */
export function compactFolio(folio: string, minDigits: number = 5): string {
   const [prefix, ...rest] = folio.split('-');
   const digits: string = rest.join('-').replace(/^0+/, '');

   return `${prefix}-${digits.padStart(minDigits, '0')}`;
}
