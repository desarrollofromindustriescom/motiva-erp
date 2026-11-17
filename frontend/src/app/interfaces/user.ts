import { SignalForm } from './alias';
import { Status } from './status';

export interface FieldsChangePassword {
   current_password: string;
   new_password: string;
   confirm_password: string;
}

export type UsersRoutes = 'createUser' | 'changePassword' | 'logout' | 'sessions' | 'revokeSessions' | 'revokeSession';

export interface UsersLoader {
   sessions: boolean;
   changePassword: boolean;
   revokeSessions: boolean;
   revokeSession: Record<string, boolean>;
}

export interface UsersForms {
   changePassword: SignalForm<FieldsChangePassword>;
}

export type UserProfile = 'superadmin' | 'administrator' | 'manager' | 'borrower' | 'investor';

export type User = {
   id: string;
   fullname: string;
   username: string;
   profile: UserProfile;
   phoneNumber: string | null;
   curp: string | null;
   address: string | null;
   guaranteeFullname: string | null;
   guaranteePhoneNumber: string | null;
   guaranteeAddress: string | null;
   accountClabe: string | null;
   accountBank: string | null;
   createdAt: string;
   status: Status;
};

export type ActiveSessionDevice = 'Desktop' | 'Mobile';

export interface ActiveSession {
   id: string;
   system: string;
   navigator: string;
   device: ActiveSessionDevice;
   first_login: string;
   last_login: string;
   current: boolean;
}

export type CreatableProfile = Exclude<UserProfile, 'superadmin'>;

export interface FieldsNewUser {
   fullname: string;
   phone_number: string;
   curp: string;
   address: string;
   with_guarantee: boolean;
   guarantee_fullname: string;
   guarantee_phone_number: string;
   guarantee_address: string;
   account_clabe: string;
   account_bank: string;
}

export interface CreatedUser {
   id: string;
   username: string;
   password: string;
}
