import { UserProfile } from '../../../interfaces/user';
import { TagSeverity } from './cash-balance.repository';

export const PROFILE_I18N_KEYS = {
   MODULE_TITLE: 'PROFILE_MODULE_TITLE',
   SECTION_TITLE_SECUTIRY: 'PRFILE_SECTION_TITLE_SECUTIRY',
   SECTION_TITLE_ACTIVE_SESSIONS: 'PRFILE_SECTION_TITLE_ACTIVE_SESSIONS',
};

export const USER_PROFILE_I18N_KEYS: Record<UserProfile, string> = {
   superadmin: 'USER_PROFILE_SUPERADMIN',
   administrator: 'USER_PROFILE_ADMINISTRATOR',
   manager: 'USER_PROFILE_MANAGER',
   borrower: 'USER_PROFILE_BORROWER',
   investor: 'USER_PROFILE_INVESTOR',
};

export const USER_PROFILE_SEVERITY: Record<UserProfile, TagSeverity> = {
   superadmin: 'contrast',
   administrator: 'info',
   manager: 'warn',
   borrower: 'secondary',
   investor: 'success',
};
