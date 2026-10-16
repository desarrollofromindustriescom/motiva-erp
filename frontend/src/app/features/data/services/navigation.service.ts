import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationModule, NavigationRoute } from '../../../interfaces/navigation';
import { APPLICATION_MODULES, PATHS } from '../repository/navigation.repository';
import { LOANS_I18N_KEYS } from '../repository/loans.repository';
import { KPIS_I18N_KEYS } from '../repository/kpis.repository';
import { USERS_I18N_KEYS } from '../repository/users.repository';
import { SETTINGS_I18N_KEYS } from '../repository/settings.repository';
import { PROFILE_I18N_KEYS } from '../repository/profile.repository';
import { HOME_I18N_KEYS } from '../repository/home.repository';
import { DASHBOARD_I18N_KEYS } from '../repository/dashboard.repository';

@Injectable({ providedIn: 'root' })
export class NavigationService {
   private readonly _router: Router = inject(Router);

   private readonly $currentModule: WritableSignal<ApplicationModule> = signal(APPLICATION_MODULES.HOME);

   public readonly navModules: NavigationRoute[] = [
      {
         icon: 'bx-wallet-alt',
         route: PATHS.DASHBOARD,
         slug: APPLICATION_MODULES.DASHBOARD,
         module: DASHBOARD_I18N_KEYS.MODULE_TITLE,
         allowed: {
            borrower: true,
            investor: true,
         },
      },
      {
         icon: 'bx-coin',
         route: PATHS.LOANS,
         slug: APPLICATION_MODULES.LOANS,
         module: LOANS_I18N_KEYS.MODULE_TITLE,
         allowed: {
            superadmin: true,
            administrator: true,
            manager: true,
         },
      },
      {
         icon: 'bx-bar-chart-big',
         route: PATHS.KPIS,
         slug: APPLICATION_MODULES.KPIS,
         module: KPIS_I18N_KEYS.MODULE_TITLE,
         allowed: {
            superadmin: true,
            administrator: true,
         },
      },
      {
         icon: 'bx-group',
         route: PATHS.USERS,
         slug: APPLICATION_MODULES.USERS,
         module: USERS_I18N_KEYS.MODULE_TITLE,
         allowed: {
            superadmin: true,
            administrator: true,
            manager: true,
         },
      },
      {
         icon: 'bx-cog',
         route: PATHS.SETTINGS,
         slug: APPLICATION_MODULES.SETTINGS,
         module: SETTINGS_I18N_KEYS.MODULE_TITLE,
         allowed: {
            superadmin: true,
            administrator: true,
         },
      },
      {
         icon: 'bx-user-circle',
         route: PATHS.PROFILE,
         slug: APPLICATION_MODULES.PROFILE,
         module: PROFILE_I18N_KEYS.MODULE_TITLE,
         allowed: {
            superadmin: true,
            administrator: true,
            manager: true,
            borrower: true,
            investor: true,
         },
      },
   ];
   public readonly navModulesBuffer = this.navModules.reduce<Record<ApplicationModule, NavigationRoute>>(
      (previous: Record<ApplicationModule, NavigationRoute>, current: NavigationRoute) => {
         previous[current.slug] = current;
         return previous;
      },
      {
         [APPLICATION_MODULES.HOME]: {
            icon: 'bx-home',
            route: PATHS.ROOT_RELATIVE,
            slug: APPLICATION_MODULES.HOME,
            module: HOME_I18N_KEYS.MODULE_TITLE,
            allowed: {
               superadmin: true,
               administrator: true,
               manager: true,
               borrower: true,
               investor: true,
            },
         },
      } as Record<ApplicationModule, NavigationRoute>,
   );

   public readonly navRoutesBuffer: Record<string, ApplicationModule> = this.navModules.reduce<
      Record<string, ApplicationModule>
   >((previous: Record<string, ApplicationModule>, current: NavigationRoute) => {
      previous[current.route] = current.slug;
      return previous;
   }, {});

   constructor() {}

   public get currentModule(): ApplicationModule {
      return this.$currentModule();
   }

   /**
    *
    */
   public updateModule({ module }: { module: ApplicationModule }): void {
      this.$currentModule.set(module);
      this._router.navigate([PATHS.ROOT, PATHS.APP, this.navModulesBuffer[module].route]);
   }
}
