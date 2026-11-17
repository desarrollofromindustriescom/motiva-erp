import { ApplicationModule, NavigationRoute } from '../../../interfaces/navigation';
import { UserProfile } from '../../../interfaces/user';

export const APPLICATION_MODULES: Record<Uppercase<ApplicationModule>, ApplicationModule> = {
   HOME: 'home',
   LOANS: 'loans',
   KPIS: 'kpis',
   USERS: 'users',
   SETTINGS: 'settings',
   PROFILE: 'profile',
   DASHBOARD: 'dashboard',
};

export const PATHS = {
   ROOT_RELATIVE: '',
   ROOT: '/',
   APP: 'app',
   CHANGE_PASSWORD: 'change-password',
   LOANS: 'loans',
   KPIS: 'kpis',
   USERS: 'users',
   SETTINGS: 'settings',
   PROFILE: 'profile',
   DASHBOARD: 'dashboard',
   ALL_ROUTES: '**',
};

/**
 * Title (translation key) of a module for a profile: some modules have their own
 * name for a profile, ex: the dashboard is the panel of the investor
 */
export function navTitle(route: NavigationRoute, profile: UserProfile | undefined): string {
   return (profile && route.titles?.[profile]) || route.module;
}
