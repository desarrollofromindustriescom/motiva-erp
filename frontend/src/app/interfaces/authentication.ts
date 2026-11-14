import { SignalForm } from './alias';

export type AuthenticationLoader = 'login' | 'validate';

export interface FieldsLogin {
   username: string;
   password: string;
}

export interface LoginPreview {
   token: string;
}

export type AuthenticationRoutes = 'validate' | 'login';

export interface AuthenticationForms {
   login: SignalForm<FieldsLogin>;
}
