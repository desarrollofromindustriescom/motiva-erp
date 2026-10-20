import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NavigationService } from '../../../../../../data/services/navigation.service';
import { ApplicationModule } from '../../../../../../../interfaces/navigation';
import { ASSETS_DIR, ICONS } from '../../../../../../data/repository/assets.repository';
import { UsersService } from '../../../../../../data/services/users.service';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { TooltipModule } from 'primeng/tooltip';

@Component({
   selector: 'fi-header-component',
   imports: [TranslatePipe, TooltipModule],
   template: `
      @let logo = ASSETS_DIR.ICONS + ICONS.MOTIVA_LOGO;
      @let loading = $loading();
      @let currentModule = $currentModule();

      <header class="w-full flex items-center justify-between bg-second rounded-2xl py-1 pr-1 pl-6">
         <h1 class="text-xl font-medium text-white">
            {{ navModulesBuffer[currentModule].module | translate }}
         </h1>
         <div class="flex items-center gap-2">
            <button
               class="group flex items-center justify-center size-10 rounded-full cursor-pointer border-2 border-white focus:bg-white hover:bg-white transition-all"
               [pTooltip]="I18N.BUTTON_LOGOUT | translate"
               [disabled]="loading"
               (click)="handleLogout()"
            >
               <i
                  class="bx bx-arrow-from-left-stroke rotate-180 text-lg text-white group-hover:text-second group-focus:text-second transition-all"
               ></i>
            </button>
            <div class="px-3 py-2 bg-white rounded-xl">
               <img
                  [src]="logo"
                  class="h-12"
               />
            </div>
         </div>
      </header>
   `,
})
export class HeaderComponent {
   private readonly _navigation: NavigationService = inject(NavigationService);
   private readonly _users: UsersService = inject(UsersService);

   public readonly I18N = FORMS_I18N_KEYS;
   public readonly ASSETS_DIR = ASSETS_DIR;
   public readonly ICONS = ICONS;
   public readonly navModulesBuffer = this._navigation.navModulesBuffer;
   public readonly $loading: Signal<boolean> = computed(() => this._users.loading);
   public readonly $currentModule: Signal<ApplicationModule> = computed(() => this._navigation.currentModule);

   constructor() {}

   public handleLogout(): void {
      this._users.logout();
   }
}
