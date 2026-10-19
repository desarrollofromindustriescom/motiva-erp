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

      <section class="size-full flex flex-col gap-6 p-4 border border-slate-500 rounded-2xl">
         <div class="w-full flex flex-col items-start justify-start">
            <h2 class="text-xl text-second">
               {{ HOME_I18N_KEYS.WELCOME_MESSAGE | translate }}
            </h2>
            <span class="text-lg font-bold text-second">{{ fullname | titlecase }}</span>
         </div>

         <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4">
            @for (nav of navModules; track nav.slug) {
               <article *fiAuthorized="nav.allowed">
                  <button
                     class="group w-full aspect-square flex flex-col items-center justify-between p-4 rounded-2xl border border-main hover:bg-main transition-all cursor-pointer"
                     (click)="handleNavigate({ module: nav.slug })"
                  >
                     <div class="flex-auto flex items-center justify-center">
                        <i
                           [class]="
                              'group-hover:text-white group-hover:scale-120 text-main bx text-5xl transition-all ' +
                              nav.icon
                           "
                        ></i>
                     </div>
                     <span class="text-base text-main/60 group-hover:text-white transition-all">{{
                        nav.module | translate
                     }}</span>
                  </button>
               </article>
            }
         </div>
      </section>
   `,
})
export class HomePageComponent {
   private readonly _navigation: NavigationService = inject(NavigationService);
   private readonly _session: SessionService = inject(SessionService);

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
