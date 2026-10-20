import { HttpContextToken } from '@angular/common/http';
import { AllowedMethods, ApiContext } from '../../../interfaces/api';
import { AuthenticationRoutes } from '../../../interfaces/authentication';
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
export const API_ROUTES: Record<Uppercase<AuthenticationRoutes | UsersRoutes>, string> = {
   LOGIN: '/login',
   VALIDATE: '/validate',
   CHANGEPASSWORD: '/users/change-password',
   LOGOUT: '/users/logout',
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
