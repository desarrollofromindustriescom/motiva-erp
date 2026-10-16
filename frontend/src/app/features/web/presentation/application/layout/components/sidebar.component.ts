import { NgClass } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { NavigationService } from '../../../../../data/services/navigation.service';
import { ApplicationModule, NavigationRoute } from '../../../../../../interfaces/navigation';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthorizedDirective } from '../../../../utilities/directives/authorized.directive';

@Component({
   selector: 'fi-sidebar-component',
   imports: [NgClass, TranslatePipe, AuthorizedDirective],
   template: `
      @let currentModule = $currentModule();

      <aside class="size-full flex flex-col max-h-full overflow-auto gap-2">
         <nav class="w-full flex flex-col border border-slate-500 rounded-2xl p-4">
            <ul class="flex flex-col w-full gap-1">
               @for (nav of navModules; track $index) {
                  <li
                     *fiAuthorized="nav.allowed"
                     class="flex w-full"
                  >
                     <button
                        class="w-full flex items-center justify-start py-3 pl-6 gap-3 rounded-xl transition-all cursor-pointer"
                        (click)="handleNavigate({ module: nav.slug })"
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
export class SidebarComponent {
   private readonly _navigation: NavigationService = inject(NavigationService);

   public readonly navModules: NavigationRoute[] = this._navigation.navModules;
   public readonly $currentModule: Signal<ApplicationModule> = computed(() => this._navigation.currentModule);

   constructor() {}

   public handleNavigate(params: { module: ApplicationModule }): void {
      this._navigation.updateModule(params);
   }
}
