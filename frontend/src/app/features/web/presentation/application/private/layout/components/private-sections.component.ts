import { NgClass } from '@angular/common';
import { Component, inject, input, InputSignal, output, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import {
   SidebarField,
   SidebarFiltersSection,
   SidebarOption,
   SidebarSection,
} from '../../../../../../../interfaces/sidebar';
import { SessionService } from '../../../../../../data/services/session.service';
import { SidebarService } from '../../../../../../data/services/sidebar.service';
import { USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';
import { AuthorizedDirective } from '../../../../../utilities/directives/authorized.directive';

const DESKTOP_MIN_WIDTH = 1280;
const MENU_GAP = 8;

@Component({
   selector: 'fi-private-sections-component',
   imports: [NgClass, FormsModule, TranslatePipe, InputTextModule, SelectModule, AuthorizedDirective],
   template: `
      @let openId = $openId();
      @let position = $position();

      @for (section of $sections(); track section.id) {
         @if (section.type === 'dropdown') {
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
                  <i
                     class="bx bx-chevron-down text-xl transition-transform xl:hidden"
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
         } @else {
            <section class="flex w-full flex-col gap-3 rounded-2xl border border-slate-500 p-4">
               <div class="flex w-full items-center justify-between">
                  <span class="text-lg font-medium">{{ section.title | translate }}</span>
                  <i [class]="'bx text-second text-2xl ' + section.icon"></i>
               </div>

               @for (field of section.fields; track field.id) {
                  <div class="flex w-full flex-col gap-1">
                     <label
                        class="text-xs"
                        [for]="section.id + '-' + field.id"
                        >{{ field.label | translate }}</label
                     >

                     @if (field.type === 'search') {
                        <div class="relative w-full">
                           <input
                              pInputText
                              class="border-contrast! w-full pr-10!"
                              autocomplete="off"
                              maxlength="128"
                              [id]="section.id + '-' + field.id"
                              [value]="value({ section, field })"
                              (input)="handleInput({ section, field, event: $event })"
                              (keydown.enter)="handleApply({ section })"
                           />
                           <i
                              class="bx bx-search text-contrast pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xl"
                           ></i>
                        </div>
                     } @else {
                        <p-select
                           class="border-contrast! w-full"
                           styleClass="w-full border-contrast!"
                           optionLabel="label"
                           optionValue="id"
                           [inputId]="section.id + '-' + field.id"
                           [options]="visibleOptions({ options: field.options })"
                           [placeholder]="I18N.FILTER_PLACEHOLDER | translate"
                           [showClear]="true"
                           [ngModel]="value({ section, field }) || null"
                           (ngModelChange)="handleChange({ section, field, value: $event })"
                        >
                           <ng-template
                              #selectedItem
                              let-option
                           >
                              {{ option.label | translate }}
                           </ng-template>
                           <ng-template
                              #item
                              let-option
                           >
                              {{ option.label | translate }}
                           </ng-template>
                        </p-select>
                     }
                  </div>
               }

               <div class="flex w-full items-center gap-2 pt-2">
                  <button
                     class="flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-red-500 p-3 text-white transition-all hover:bg-red-600 focus:bg-red-600"
                     type="button"
                     [attr.aria-label]="I18N.BUTTON_CLEAR_FILTERS | translate"
                     (click)="handleClear({ section })"
                  >
                     <i class="bx bx-trash text-xl"></i>
                  </button>
                  <button
                     class="bg-second hover:bg-second-light focus:bg-second-light flex-auto cursor-pointer rounded-lg px-6 py-3 text-white transition-all"
                     type="button"
                     (click)="handleApply({ section })"
                  >
                     {{ I18N.BUTTON_FILTER | translate }}
                  </button>
               </div>
            </section>
         }
      }
   `,
})
export class PrivateSectionsComponent {
   private readonly _session: SessionService = inject(SessionService);
   private readonly _sidebar: SidebarService = inject(SidebarService);

   public readonly I18N = USERS_I18N_KEYS;

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

   /**
    * Options of a select the current profile is allowed to use
    */
   public visibleOptions({ options }: { options: SidebarOption[] | undefined }): SidebarOption[] {
      const profile = this._session.session?.profile;

      return (options ?? []).filter((option: SidebarOption) => !!profile && option.allowed[profile]);
   }

   public value({ section, field }: { section: SidebarFiltersSection; field: SidebarField }): string {
      return this._sidebar.valueOf({ section: section.id, field: field.id });
   }

   public handleInput({
      section,
      field,
      event,
   }: {
      section: SidebarFiltersSection;
      field: SidebarField;
      event: Event;
   }): void {
      this._sidebar.setValue({
         section: section.id,
         field: field.id,
         value: (event.target as HTMLInputElement).value,
      });
   }

   public handleChange({
      section,
      field,
      value,
   }: {
      section: SidebarFiltersSection;
      field: SidebarField;
      value: string | null;
   }): void {
      this._sidebar.setValue({ section: section.id, field: field.id, value: value ?? '' });
   }

   public handleApply({ section }: { section: SidebarFiltersSection }): void {
      this._sidebar.applyFilters({ section: section.id });
   }

   public handleClear({ section }: { section: SidebarFiltersSection }): void {
      this._sidebar.clearFilters({ section: section.id });
   }
}
