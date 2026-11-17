import { Component, computed, inject, input, InputSignal, output, OutputEmitterRef, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationModule, NavigationRoute } from '../../../../../../../interfaces/navigation';
import { ASSETS_DIR, ICONS } from '../../../../../../data/repository/assets.repository';
import { TooltipModule } from 'primeng/tooltip';
import { navTitle } from '../../../../../../data/repository/navigation.repository';
import { SessionService } from '../../../../../../data/services/session.service';
import { UserProfile } from '../../../../../../../interfaces/user';

@Component({
   selector: 'fi-private-header-component',
   imports: [TranslatePipe, TooltipModule],
   template: `
      @let logo = ASSETS_DIR.ICONS + ICONS.MOTIVA_LOGO;
      @let currentModule = $currentModule();
      @let navModulesBuffer = $navModulesBuffer();

      <header
         class="bg-second flex w-full shrink-0 items-center justify-between gap-3 rounded-2xl px-3 py-3 sm:px-6 md:py-1 md:pr-1"
      >
         <div class="flex min-w-0 items-center gap-3">
            <button
               class="flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 text-white transition-all hover:bg-white/15 focus:bg-white/15 xl:hidden"
               type="button"
               (click)="$toggleSidebar.emit()"
            >
               <i class="bx bx-menu text-2xl"></i>
            </button>
            <h1 class="truncate text-lg font-medium text-white sm:text-xl">
               {{ title(navModulesBuffer[currentModule]) | translate }}
            </h1>
         </div>
         <div class="flex shrink-0 items-center gap-2">
            <div class="hidden rounded-xl bg-white px-3 py-2 md:block">
               <img
                  [src]="logo"
                  class="h-12"
               />
            </div>
         </div>
      </header>
   `,
})
export class PrivateHeaderComponent {
   private readonly _session: SessionService = inject(SessionService);

   public readonly ASSETS_DIR = ASSETS_DIR;
   public readonly ICONS = ICONS;

   public readonly $profile: Signal<UserProfile | undefined> = computed(() => this._session.session?.profile);

   public $currentModule: InputSignal<ApplicationModule> = input.required({ alias: 'currentModule' });
   public $navModulesBuffer: InputSignal<Record<ApplicationModule, NavigationRoute>> = input.required({
      alias: 'navModulesBuffer',
   });

   public $toggleSidebar: OutputEmitterRef<void> = output({ alias: 'toggleSidebar' });

   constructor() {}

   public title(nav: NavigationRoute): string {
      return navTitle(nav, this.$profile());
   }
}
