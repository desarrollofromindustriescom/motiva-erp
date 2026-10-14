import { SignalForm } from './alias';

export interface FieldsLogin {
   username: string;
   password: string;
}

export type AuthRoutes = 'verifyToken' | 'login';

export interface AuthForms {
   login: SignalForm<FieldsLogin>;
}
