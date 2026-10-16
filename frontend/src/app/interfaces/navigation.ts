export type ApplicationModule = 'home' | 'loans' | 'kpis' | 'users' | 'settings' | 'profile';

export interface NavigationRoute {
   icon: string;
   route: string;
   slug: ApplicationModule;
   module: string;
}
