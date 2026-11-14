import { Component, input, InputSignal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationModule, NavigationRoute } from '../../../../../../../interfaces/navigation';
import { ASSETS_DIR, ICONS } from '../../../../../../data/repository/assets.repository';
import { TooltipModule } from 'primeng/tooltip';

@Component({
   selector: 'fi-private-header-component',
   imports: [TranslatePipe, TooltipModule],
   template: `
      @let logo = ASSETS_DIR.ICONS + ICONS.MOTIVA_LOGO;
      @let currentModule = $currentModule();
      @let navModulesBuffer = $navModulesBuffer();

      <header class="bg-second flex w-full items-center justify-between rounded-2xl py-4 pr-6 pl-6 md:py-1 md:pr-1">
         <h1 class="text-xl font-medium text-white">
            {{ navModulesBuffer[currentModule].module | translate }}
         </h1>
         <div class="flex items-center gap-2">
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
   public readonly ASSETS_DIR = ASSETS_DIR;
   public readonly ICONS = ICONS;

   public $currentModule: InputSignal<ApplicationModule> = input.required({ alias: 'currentModule' });
   public $navModulesBuffer: InputSignal<Record<ApplicationModule, NavigationRoute>> = input.required({
      alias: 'navModulesBuffer',
   });

   constructor() {}
}
