import { Status } from './status';

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
