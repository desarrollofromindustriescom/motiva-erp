import { UserProfile } from './user';

export type ApplicationModule = 'home' | 'loans' | 'kpis' | 'users' | 'settings' | 'profile' | 'dashboard';

export interface NavigationRoute {
   icon: string;
   route: string;
   slug: ApplicationModule;
   module: string;
   // title of the module for the profiles that call it differently
   titles?: Partial<Record<UserProfile, string>>;
   allowed: Partial<Record<UserProfile, boolean>>;
}
