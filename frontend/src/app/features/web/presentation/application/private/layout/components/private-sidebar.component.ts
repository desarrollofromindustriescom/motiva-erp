import { NgClass } from '@angular/common';
import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { ApplicationModule, NavigationRoute } from '../../../../../../../interfaces/navigation';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthorizedDirective } from '../../../../../utilities/directives/authorized.directive';

@Component({
   selector: 'fi-private-sidebar-component',
   imports: [NgClass, TranslatePipe, AuthorizedDirective],
   template: `
      @let navModules = $navModules();
      @let currentModule = $currentModule();

      <aside class="size-full flex flex-col max-h-full overflow-auto gap-2">
         <nav class="w-full flex flex-col border border-slate-500 rounded-2xl p-4">
            <ul class="flex flex-col w-full gap-1">
               @for (nav of navModules; track $index) {
                  <li
                     class="flex w-full"
                     *fiAuthorized="nav.allowed"
                  >
                     <button
                        class="w-full flex items-center justify-start py-3 pl-6 gap-3 rounded-xl transition-all cursor-pointer"
                        (click)="$navigate.emit({ module: nav.slug })"
                        [ngClass]="{
                           'text-second/80 hover:bg-slate-200': currentModule !== nav.slug,
                           'text-white bg-second': currentModule === nav.slug,
                        }"
                     >
                        <i [class]="'bx text-2xl ' + nav.icon"></i>
                        <span class="text-base">{{ nav.module | translate }}</span>
                     </button>
                  </li>
               }
            </ul>
         </nav>
      </aside>
   `,
})
export class PrivateSidebarComponent {
   public $navModules: InputSignal<NavigationRoute[]> = input([] as NavigationRoute[], { alias: 'navModules' });
   public $currentModule: InputSignal<ApplicationModule> = input.required({ alias: 'currentModule' });
   public $navigate: OutputEmitterRef<{ module: ApplicationModule }> = output({ alias: 'navigate' });
}
