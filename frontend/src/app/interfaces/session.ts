import { UserProfile } from './user';

export interface Session {
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
}
