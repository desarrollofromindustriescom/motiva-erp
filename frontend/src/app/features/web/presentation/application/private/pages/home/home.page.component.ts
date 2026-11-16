import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NavigationService } from '../../../../../../data/services/navigation.service';
import { SessionService } from '../../../../../../data/services/session.service';
import { HOME_I18N_KEYS } from '../../../../../../data/repository/home.repository';
import { ApplicationModule, NavigationRoute } from '../../../../../../../interfaces/navigation';
import { AuthorizedDirective } from '../../../../../utilities/directives/authorized.directive';
import { TitleCasePipe } from '@angular/common';

@Component({
   selector: 'fi-home-page-component',
   imports: [TranslatePipe, AuthorizedDirective, TitleCasePipe],
   template: `
      @let fullname = $fullname();

      <section class="flex w-full flex-col gap-4 rounded-2xl border border-slate-500 p-4 sm:gap-6 sm:p-6">
         <div class="flex w-full flex-col items-start justify-start">
            <h2 class="text-second text-xl">
               {{ HOME_I18N_KEYS.WELCOME_MESSAGE | translate }}
            </h2>
            <span class="text-second text-lg font-bold wrap-anywhere">{{ fullname | titlecase }}</span>
         </div>

         <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            @for (nav of navModules; track nav.slug) {
               <article *fiAuthorized="nav.allowed">
                  <button
                     class="group border-main hover:bg-main flex aspect-square w-full cursor-pointer flex-col items-center justify-between rounded-2xl border p-3 transition-all sm:p-4"
                     (click)="handleNavigate({ module: nav.slug })"
                  >
                     <div class="flex flex-auto items-center justify-center">
                        <i
                           [class]="
                              'text-main bx text-4xl transition-all group-hover:scale-120 group-hover:text-white sm:text-5xl ' +
                              nav.icon
                           "
                        ></i>
                     </div>
                     <span
                        class="text-main/60 text-center text-sm transition-all group-hover:text-white sm:text-base"
                        >{{ nav.module | translate }}</span
                     >
                  </button>
               </article>
            }
         </div>
      </section>
   `,
})
export class HomePageComponent {
   private readonly _session: SessionService = inject(SessionService);
   private readonly _navigation: NavigationService = inject(NavigationService);

   public readonly HOME_I18N_KEYS = HOME_I18N_KEYS;
   public readonly navModules: NavigationRoute[] = this._navigation.navModules;

   public readonly $fullname: Signal<string> = computed((): string => {
      const session = this._session.session;
      return session ? session.fullname : '';
   });

   constructor() {}

   public handleNavigate(params: { module: ApplicationModule }): void {
      this._navigation.updateModule(params);
   }
}
