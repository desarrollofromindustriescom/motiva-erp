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

@Injectable({ providedIn: 'root' })
export class NavigationService {
   private readonly $currentModule: WritableSignal<ApplicationModule> = signal(APPLICATION_MODULES.HOME);

   public readonly navModules: NavigationRoute[] = [
      {
         icon: 'bx-coin',
         route: PATHS.LOANS,
         slug: APPLICATION_MODULES.LOANS,
         module: LOANS_I18N_KEYS.MODULE_TITLE,
      },
      {
         icon: 'bx-bar-chart-big',
         route: PATHS.KPIS,
         slug: APPLICATION_MODULES.KPIS,
         module: KPIS_I18N_KEYS.MODULE_TITLE,
      },
      {
         icon: 'bx-group',
         route: PATHS.USERS,
         slug: APPLICATION_MODULES.USERS,
         module: USERS_I18N_KEYS.MODULE_TITLE,
      },
      {
         icon: 'bx-cog',
         route: PATHS.SETTINGS,
         slug: APPLICATION_MODULES.SETTINGS,
         module: SETTINGS_I18N_KEYS.MODULE_TITLE,
      },
      {
         icon: 'bx-user-circle',
         route: PATHS.PROFILE,
         slug: APPLICATION_MODULES.PROFILE,
         module: PROFILE_I18N_KEYS.MODULE_TITLE,
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
         },
      } as Record<ApplicationModule, NavigationRoute>,
   );

   private readonly router = inject(Router);

   constructor() {}

   public get currentModule(): ApplicationModule {
      return this.$currentModule();
   }

   /**
    *
    */
   public updateModule({ module }: { module: ApplicationModule }): void {
      this.$currentModule.set(module);
      this.router.navigate([PATHS.ROOT, PATHS.APP, this.navModulesBuffer[module].route]);
   }
}
