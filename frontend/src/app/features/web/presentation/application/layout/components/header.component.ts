import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NavigationService } from '../../../../../data/services/navigation.service';
import { ApplicationModule } from '../../../../../../interfaces/navigation';
import { ASSETS_DIR, ICONS } from '../../../../../data/repository/assets.repository';

@Component({
   selector: 'fi-header-component',
   imports: [TranslatePipe],
   template: `
      @let logo = ASSETS_DIR.ICONS + ICONS.MOTIVA_LOGO;
      @let currentModule = $currentModule();

      <header class="w-full flex items-center justify-between bg-second rounded-2xl py-1 pr-1 pl-6">
         <h1 class="text-xl font-semibold text-white">
            {{ navModulesBuffer[currentModule].module | translate }}
         </h1>
         <div class="px-3 py-2 bg-white rounded-xl">
            <img
               [src]="logo"
               class="h-12"
            />
         </div>
      </header>
   `,
})
export class HeaderComponent {
   private readonly _navigation: NavigationService = inject(NavigationService);

   public readonly ASSETS_DIR = ASSETS_DIR;
   public readonly ICONS = ICONS;
   public readonly navModulesBuffer = this._navigation.navModulesBuffer;
   public readonly $currentModule: Signal<ApplicationModule> = computed(() => this._navigation.currentModule);
}
