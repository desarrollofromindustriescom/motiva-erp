import { ApplicationModule } from '../../../interfaces/navigation';

export const APPLICATION_MODULES: Record<Uppercase<ApplicationModule>, ApplicationModule> = {
   HOME: 'home',
   LOANS: 'loans',
   KPIS: 'kpis',
   USERS: 'users',
   SETTINGS: 'settings',
   PROFILE: 'profile',
};

export const PATHS = {
   ROOT_RELATIVE: '',
   ROOT: '/',
   APP: 'app',
   LOANS: 'loans',
   KPIS: 'kpis',
   USERS: 'users',
   SETTINGS: 'settings',
   PROFILE: 'profile',
   ALL_ROUTES: '**',
};
