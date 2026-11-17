import { UserProfile } from './user';

export type SessionLoader = 'logout' | 'token';

export interface Session {
   id: string;
   fullname: string;
   username: string;
   // false until the user changes the password it was given, it must be changed before using the app
   password_changed: boolean;
   profile: UserProfile;
   phoneNumber: string | null;
   curp: string | null;
   address: string | null;
   guaranteeFullname: string | null;
   guaranteePhoneNumber: string | null;
   guaranteeAddress: string | null;
   accountClabe: string | null;
   accountBank: string | null;
}
