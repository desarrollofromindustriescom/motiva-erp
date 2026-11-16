import { NgClass } from '@angular/common';
import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { ApplicationModule, NavigationRoute } from '../../../../../../../interfaces/navigation';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthorizedDirective } from '../../../../../utilities/directives/authorized.directive';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';

@Component({
   selector: 'fi-private-sidebar-component',
   imports: [NgClass, TranslatePipe, AuthorizedDirective],
   template: `
      @let navModules = $navModules();
      @let currentModule = $currentModule();

      <aside class="flex size-full max-h-full flex-col gap-2 overflow-auto">
         <button
            class="text-second ml-auto flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 transition-all hover:bg-slate-200 xl:hidden"
            type="button"
            (click)="$close.emit()"
         >
            <i class="bx bx-x text-3xl"></i>
         </button>

         <nav class="flex w-full flex-col rounded-2xl border border-slate-500 p-4">
            <ul class="flex w-full flex-col gap-1">
               @for (nav of navModules; track $index) {
                  <li
                     class="flex w-full"
                     *fiAuthorized="nav.allowed"
                  >
                     <button
                        class="flex w-full cursor-pointer items-center justify-start gap-3 rounded-xl py-3 pl-6 transition-all"
                        (click)="$navigate.emit({ module: nav.slug })"
                        [ngClass]="{
                           'text-second/80 hover:bg-slate-200': currentModule !== nav.slug,
                           'bg-second text-white': currentModule === nav.slug,
                        }"
                     >
                        <i [class]="'bx text-2xl ' + nav.icon"></i>
                        <span class="text-base">{{ nav.module | translate }}</span>
                     </button>
                  </li>
               }
            </ul>
         </nav>

         <div class="flex w-full flex-col gap-2 rounded-2xl border border-slate-500 p-4">
            <span class="text-lg font-medium">Sesion</span>
            <button
               class="group border-contrast hover:bg-contrast focus:bg-contrast flex w-full cursor-pointer items-center justify-start gap-3 rounded-xl border-2 py-3 pl-6 transition-all"
               (click)="$logout.emit()"
            >
               <i
                  class="bx bx-arrow-from-left-stroke text-contrast rotate-180 text-xl transition-all group-hover:text-white group-focus:text-white"
               ></i>
               <span class="text-contrast text-base transition-all group-hover:text-white group-focus:text-white">{{
                  I18N.BUTTON_LOGOUT | translate
               }}</span>
            </button>
         </div>
      </aside>
   `,
})
export class PrivateSidebarComponent {
   public readonly I18N = FORMS_I18N_KEYS;

   public $navModules: InputSignal<NavigationRoute[]> = input([] as NavigationRoute[], { alias: 'navModules' });
   public $currentModule: InputSignal<ApplicationModule> = input.required({ alias: 'currentModule' });
   public $navigate: OutputEmitterRef<{ module: ApplicationModule }> = output({ alias: 'navigate' });
   public $close: OutputEmitterRef<void> = output({ alias: 'close' });
   public $logout: OutputEmitterRef<void> = output({ alias: 'logout' });
}
