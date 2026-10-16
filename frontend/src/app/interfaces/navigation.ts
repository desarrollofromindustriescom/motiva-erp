import { UserProfile } from './user';

export type ApplicationModule = 'home' | 'loans' | 'kpis' | 'users' | 'settings' | 'profile' | 'dashboard';

export interface NavigationRoute {
   icon: string;
   route: string;
   slug: ApplicationModule;
   module: string;
   allowed: Partial<Record<UserProfile, boolean>>;
}
