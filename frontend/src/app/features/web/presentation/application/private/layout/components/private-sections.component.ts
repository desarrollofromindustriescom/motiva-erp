import { NgClass } from '@angular/common';
import { Component, input, InputSignal, output, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SidebarSection } from '../../../../../../../interfaces/sidebar';
import { AuthorizedDirective } from '../../../../../utilities/directives/authorized.directive';

const DESKTOP_MIN_WIDTH = 1280;
const MENU_GAP = 8;

@Component({
   selector: 'fi-private-sections-component',
   imports: [NgClass, TranslatePipe, AuthorizedDirective],
   template: `
      @let openId = $openId();
      @let position = $position();

      @for (section of $sections(); track section.id) {
         <section class="flex w-full flex-col gap-2 rounded-2xl border border-slate-500 p-4">
            <span class="text-lg font-medium">{{ section.title | translate }}</span>

            <button
               class="group border-contrast text-contrast hover:bg-contrast focus:bg-contrast flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 transition-all hover:text-white focus:text-white"
               type="button"
               (click)="handleToggle({ id: section.id, event: $event })"
            >
               <span class="flex items-center gap-3">
                  <i [class]="'bx text-xl ' + section.button.icon"></i>
                  <span class="text-base">{{ section.button.label | translate }}</span>
               </span>
               <i
                  class="bx bx-chevron-right hidden text-xl transition-transform xl:block"
                  [ngClass]="{ 'rotate-180': openId === section.id }"
               ></i>
            </button>

            @if (openId === section.id && position) {
               <button
                  class="fixed inset-0 z-40 cursor-default"
                  type="button"
                  tabindex="-1"
                  (click)="$openId.set(null)"
               ></button>

               <ul
                  class="fixed z-50 flex flex-col gap-1 rounded-xl border border-slate-300 bg-white p-2 shadow-lg"
                  [style.top.px]="position.top"
                  [style.left.px]="position.left"
                  [style.min-width.px]="position.width"
               >
                  @for (option of section.options; track option.id) {
                     <li *fiAuthorized="option.allowed">
                        <button
                           class="text-second/80 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-slate-200 focus:bg-slate-200"
                           type="button"
                           (click)="handleSelect({ section: section.id, option: option.id })"
                        >
                           <i [class]="'bx text-xl ' + option.icon"></i>
                           <span class="text-base">{{ option.label | translate }}</span>
                        </button>
                     </li>
                  }
               </ul>
            }
         </section>
      }
   `,
})
export class PrivateSectionsComponent {
   public readonly $openId: WritableSignal<string | null> = signal(null);
   public readonly $position: WritableSignal<{ top: number; left: number; width: number } | null> = signal(null);

   public $sections: InputSignal<SidebarSection[]> = input([] as SidebarSection[], { alias: 'sections' });
   public $choose: OutputEmitterRef<{ section: string; option: string }> = output({ alias: 'choose' });

   /**
    * Opens the options at the right of the button on desktop (same level),
    * or right below it on small screens
    */
   public handleToggle({ id, event }: { id: string; event: Event }): void {
      if (this.$openId() === id) {
         this.$openId.set(null);
         return;
      }

      const rect: DOMRect = (event.currentTarget as HTMLElement).getBoundingClientRect();

      if (window.innerWidth >= DESKTOP_MIN_WIDTH) {
         this.$position.set({ top: rect.top, left: rect.right + MENU_GAP, width: 0 });
      } else {
         this.$position.set({ top: rect.bottom + MENU_GAP / 2, left: rect.left, width: rect.width });
      }

      this.$openId.set(id);
   }

   public handleSelect(params: { section: string; option: string }): void {
      this.$openId.set(null);
      this.$choose.emit(params);
   }
}
