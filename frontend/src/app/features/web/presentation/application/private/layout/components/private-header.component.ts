import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationModule, NavigationRoute } from '../../../../../../../interfaces/navigation';
import { ASSETS_DIR, ICONS } from '../../../../../../data/repository/assets.repository';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { TooltipModule } from 'primeng/tooltip';
import { LoaderComponent } from '../../../../common/forms/loader/loader.component';

@Component({
   selector: 'fi-private-header-component',
   imports: [TranslatePipe, TooltipModule, LoaderComponent],
   template: `
      @let logo = ASSETS_DIR.ICONS + ICONS.MOTIVA_LOGO;
      @let loading = $loading();
      @let currentModule = $currentModule();
      @let navModulesBuffer = $navModulesBuffer();

      <header class="w-full flex items-center justify-between bg-second rounded-2xl py-1 pr-1 pl-6">
         <h1 class="text-xl font-medium text-white">
            {{ navModulesBuffer[currentModule].module | translate }}
         </h1>
         <div class="flex items-center gap-2">
            <button
               class="group flex items-center justify-center size-10 rounded-full cursor-pointer border-2 border-white focus:bg-white hover:bg-white disabled:opacity-80 disabled:bg-white transition-all"
               [pTooltip]="I18N.BUTTON_LOGOUT | translate"
               [tooltipDisabled]="loading"
               [showDelay]="1500"
               [disabled]="loading"
               (click)="$logout.emit()"
            >
               @if (loading) {
                  <fi-loader-component />
               } @else {
                  <i
                     class="bx bx-arrow-from-left-stroke rotate-180 text-lg text-white group-hover:text-second group-focus:text-second transition-all"
                  ></i>
               }
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
export class PrivateHeaderComponent {
   public readonly I18N = FORMS_I18N_KEYS;
   public readonly ASSETS_DIR = ASSETS_DIR;
   public readonly ICONS = ICONS;

   public $loading: InputSignal<boolean> = input(false, { alias: 'loading' });
   public $currentModule: InputSignal<ApplicationModule> = input.required({ alias: 'currentModule' });
   public $navModulesBuffer: InputSignal<Record<ApplicationModule, NavigationRoute>> = input.required({
      alias: 'navModulesBuffer',
   });
   public $logout: OutputEmitterRef<void> = output({ alias: 'logout' });

   constructor() {}
}
