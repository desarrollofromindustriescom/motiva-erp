import { HttpContextToken } from '@angular/common/http';
import { AllowedMethods, ApiContext } from '../../../interfaces/api';
import { AuthenticationRoutes } from '../../../interfaces/authentication';
import { CashBalanceRoutes } from '../../../interfaces/cash-balance';
import { SettingsRoutes } from '../../../interfaces/settings';
import { InvestmentsRoutes } from '../../../interfaces/investment';
import { LoansRoutes } from '../../../interfaces/loan';
import { KpisRoutes } from '../../../interfaces/kpis';
import { UsersRoutes } from '../../../interfaces/user';

export const DEFAULT_ERR_TITLE: string = 'DEFAULT_ERR_MESSAGE';
export const DEFAULT_SUCCESS_TITLE: string = 'DEFAULT_SUCCESS_TITLE';
export const DEFAULT_SUCCESS_MESSAGE: string = 'DEFAULT_SUCCESS_MESSAGE';
export const ERR_CODE_TITLES: Record<number, string> = {
   400: 'ERR_TITLE_BAD_REQUEST',
   401: 'ERR_TITLE_UNAUTHORIZED',
   404: 'ERR_TITLE_NOT_FOUND',
   413: 'ERR_TITLE_CONTENT_TOO_LARGE',
   429: 'ERR_TITLE_TOO_MANY_REQUEST',
   500: 'ERR_TITLE_INTERNAL_SERVER_ERROR',
};
export const API_ROUTES: Record<
   Uppercase<
      | AuthenticationRoutes
      | UsersRoutes
      | SettingsRoutes
      | CashBalanceRoutes
      | InvestmentsRoutes
      | LoansRoutes
      | KpisRoutes
   >,
   string
> = {
   LOGIN: '/login',
   VALIDATE: '/validate',
   CREATEUSER: '/users',
   LISTUSERS: '/users',
   GETUSER: '/users/',
   DELETEUSER: '/users/',
   UPDATEUSER: '/users/',
   REGENERATEPASSWORD: '/users/',
   INVESTORBALANCE: '/users/',
   INVESTMENTS: '/users/',
   CANCELLATIONS: '/users/',
   MYBALANCE: '/investor/balance',
   CYCLES: '/cash-balance/cycles',
   CHANGEPASSWORD: '/users/change-password',
   LOGOUT: '/users/logout',
   SESSIONS: '/users/sessions',
   REVOKESESSIONS: '/users/sessions',
   REVOKESESSION: '/users/session/',
   SETTINGS: '/settings',
   UPDATEEXTRAS: '/settings/extras',
   UPDATEAGREEMENTS: '/settings/agreements',
   UPDATEMONTHLY: '/settings/monthly',
   UPDATEWEEKLY: '/settings/weekly',
   CASHBALANCE: '/cash-balance',
   DEPOSIT: '/cash-balance/deposit',
   WITHDRAW: '/cash-balance/withdraw',
   MOVEMENTS: '/cash-balance/movements',
   LOANFUNDS: '/loans/funds',
   CREATELOAN: '/loans',
   LISTLOANS: '/loans',
   LOANSEXCEL: '/loans/excel',
   AGREEMENTLOANS: '/agreements/loans',
   CREATEAGREEMENT: '/agreements',
   GETLOAN: '/loans/',
   UPDATELOAN: '/loans/',
   LOANPAYMENTS: '/loans/',
   LOANDEPOSITS: '/loans/',
   LOANBREAKDOWN: '/loans/',
   KPIS: '/kpis',
   LOANSCALENDAR: '/loans/calendar',
   LOANSCALENDAREXCEL: '/loans/calendar/excel',
   MYSUMMARY: '/borrower/summary',
   MYLOANS: '/borrower/loans',
   ADDLOANVISIT: '/loans/',
   PAYLOANPAYMENT: '/loans/',
   APPROVELOAN: '/loans/',
};
export const HTTP_METHODS: Record<AllowedMethods, AllowedMethods> = {
   GET: 'GET',
   POST: 'POST',
   PUT: 'PUT',
   PATCH: 'PATCH',
   DELETE: 'DELETE',
   QUERY: 'QUERY',
};
export const API_CONTEXT: Record<ApiContext, HttpContextToken<boolean>> = {
   IGNORE_ERROR: new HttpContextToken<boolean>(() => false),
   IGNORE_SUCCESS: new HttpContextToken<boolean>(() => false),
};
export const HEADERS = {
   KEYS: {
      AUTHORIZATION: 'Authorization',
      ACCEPT_LANGUAGE: 'Accept-Language',
   },
   VALUES: {
      AUTHORIZATION: 'Bearer',
   },
};
