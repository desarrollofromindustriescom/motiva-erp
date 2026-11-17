import { NgClass } from '@angular/common';
import {
   Component,
   computed,
   inject,
   input,
   InputSignal,
   output,
   OutputEmitterRef,
   Signal,
   signal,
   WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import {
   SidebarField,
   SidebarFiltersSection,
   SidebarOption,
   SidebarSection,
} from '../../../../../../../interfaces/sidebar';
import { SessionService } from '../../../../../../data/services/session.service';
import { SidebarService } from '../../../../../../data/services/sidebar.service';
import { LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';
import { LoanBorrowersService } from '../../../../../../data/services/loan-borrowers.service';
import { UserRow } from '../../../../../../../interfaces/user';
import { AuthorizedDirective } from '../../../../../utilities/directives/authorized.directive';

const EMPTY_OPTIONS: SidebarOption[] = [];
const DESKTOP_MIN_WIDTH = 1280;
const MENU_GAP = 8;

@Component({
   selector: 'fi-private-sections-component',
   imports: [
      NgClass,
      FormsModule,
      TranslatePipe,
      CheckboxModule,
      DatePickerModule,
      InputNumberModule,
      InputTextModule,
      MultiSelectModule,
      SelectModule,
      AuthorizedDirective,
   ],
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
                     class="bx bx-chevron-right hidden! text-xl transition-transform xl:block!"
                     [ngClass]="{ 'rotate-180': openId === section.id }"
                  ></i>
                  <i
                     class="bx bx-chevron-down text-xl transition-transform xl:hidden!"
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
         } @else if (section.type === 'actions') {
            <section class="flex w-full flex-col gap-3 rounded-2xl border border-slate-500 p-4">
               <span class="text-lg font-medium">{{ section.title | translate }}</span>

               @for (option of section.options; track option.id) {
                  <ng-container *fiAuthorized="option.allowed">
                     <button
                        class="group border-contrast text-contrast hover:bg-contrast focus:bg-contrast flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 transition-all hover:text-white focus:text-white"
                        type="button"
                        (click)="handleSelect({ section: section.id, option: option.id })"
                     >
                        <span class="flex items-center gap-3">
                           <i [class]="'bx text-xl ' + option.icon"></i>
                           <span class="text-base">{{ option.label | translate }}</span>
                        </span>
                        @if (option.submenu) {
                           <i class="bx bx-chevron-right text-xl"></i>
                        }
                     </button>
                  </ng-container>
               }
            </section>
         } @else {
            <section class="flex w-full flex-col gap-3 rounded-2xl border border-slate-500 p-4">
               <div class="flex w-full items-center justify-between">
                  <span class="text-lg font-medium">{{ section.title | translate }}</span>
                  <i [class]="'bx text-second text-2xl ' + section.icon"></i>
               </div>

               @for (field of section.fields; track field.id) {
                  @switch (field.type) {
                     @case ('checkbox') {
                        <label
                           class="flex w-full cursor-pointer items-center gap-2 text-sm"
                           [for]="section.id + '-' + field.id"
                        >
                           <p-checkbox
                              [inputId]="section.id + '-' + field.id"
                              [binary]="true"
                              [ngModel]="value({ section, field }) === 'true'"
                              (ngModelChange)="handleChange({ section, field, value: $event ? 'true' : '' })"
                           />
                           {{ field.label | translate }}
                        </label>
                     }
                     @default {
                        <div class="flex w-full flex-col gap-1">
                           <label
                              class="text-xs"
                              [for]="section.id + '-' + field.id"
                              >{{ field.label | translate }}</label
                           >

                           @switch (field.type) {
                              @case ('search') {
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
                              }
                              @case ('multiselect') {
                                 <p-multiselect
                                    class="border-contrast! w-full"
                                    styleClass="w-full border-contrast!"
                                    optionLabel="label"
                                    optionValue="id"
                                    appendTo="body"
                                    display="comma"
                                    [inputId]="section.id + '-' + field.id"
                                    [options]="visibleOptions({ options: field.options })"
                                    [placeholder]="I18N.FILTER_PLACEHOLDER | translate"
                                    [showToggleAll]="false"
                                    [showClear]="true"
                                    [ngModel]="ids({ section, field })"
                                    (ngModelChange)="handleList({ section, field, ids: $event })"
                                 >
                                    <ng-template
                                       #selectedItems
                                       let-selected
                                    >
                                       {{ labels({ field, ids: selected }) | translate }}
                                    </ng-template>
                                    <ng-template
                                       #item
                                       let-option
                                    >
                                       {{ option.label | translate }}
                                    </ng-template>
                                 </p-multiselect>
                              }
                              @case ('borrowers') {
                                 <p-multiselect
                                    class="border-contrast! w-full"
                                    styleClass="w-full border-contrast!"
                                    optionLabel="fullname"
                                    optionValue="id"
                                    appendTo="body"
                                    display="comma"
                                    filterBy="fullname,username,curp"
                                    [inputId]="section.id + '-' + field.id"
                                    [options]="borrowerOptions({ section, field })"
                                    [placeholder]="I18N.FILTER_PLACEHOLDER | translate"
                                    [filter]="true"
                                    [showToggleAll]="false"
                                    [showClear]="true"
                                    [resetFilterOnHide]="true"
                                    [filterPlaceHolder]="LOANS.BORROWER_SEARCH | translate"
                                    [emptyFilterMessage]="LOANS.BORROWER_EMPTY | translate"
                                    [emptyMessage]="LOANS.BORROWER_EMPTY | translate"
                                    [loading]="$searchingBorrowers()"
                                    [ngModel]="ids({ section, field })"
                                    (ngModelChange)="handleList({ section, field, ids: $event })"
                                    (onFilter)="handleBorrowerSearch($event.filter)"
                                 >
                                    <ng-template
                                       #selectedItems
                                       let-selected
                                    >
                                       {{ borrowerNames({ ids: selected }) }}
                                    </ng-template>
                                    <ng-template
                                       #item
                                       let-borrower
                                    >
                                       <div class="flex flex-col">
                                          <span>{{ borrower.fullname }}</span>
                                          <span class="text-xs opacity-70">{{
                                             borrower.curp || borrower.username
                                          }}</span>
                                       </div>
                                    </ng-template>
                                 </p-multiselect>
                              }
                              @case ('daterange') {
                                 <p-datepicker
                                    class="w-full"
                                    styleClass="w-full"
                                    inputStyleClass="border-contrast! w-full"
                                    selectionMode="range"
                                    dateFormat="dd/mm/yy"
                                    appendTo="body"
                                    iconDisplay="input"
                                    [inputId]="section.id + '-' + field.id"
                                    [showIcon]="true"
                                    [showClear]="true"
                                    [readonlyInput]="true"
                                    [placeholder]="LOANS.FILTER_DATE_PLACEHOLDER | translate"
                                    [ngModel]="dates({ section, field })"
                                    (ngModelChange)="handleDates({ section, field, dates: $event })"
                                 />
                              }
                              @case ('range') {
                                 <div class="grid w-full grid-cols-2 gap-2">
                                    @for (index of [0, 1]; track index) {
                                       <p-inputnumber
                                          class="w-full"
                                          mode="decimal"
                                          locale="en-US"
                                          inputStyleClass="border-contrast! w-full"
                                          [inputId]="section.id + '-' + field.id + '-' + index"
                                          [prefix]="field.unit === 'money' ? '$ ' : ''"
                                          [suffix]="field.unit === 'percent' ? ' %' : ''"
                                          [min]="0"
                                          [minFractionDigits]="0"
                                          [maxFractionDigits]="
                                             field.unit === 'integer' ? 0 : field.unit === 'money' ? 2 : 3
                                          "
                                          [placeholder]="(index === 0 ? LOANS.RANGE_MIN : LOANS.RANGE_MAX) | translate"
                                          [ngModel]="bound({ section, field, index })"
                                          (ngModelChange)="handleBound({ section, field, index, bound: $event })"
                                       />
                                    }
                                 </div>
                              }
                              @default {
                                 <p-select
                                    class="border-contrast! w-full"
                                    styleClass="w-full border-contrast!"
                                    optionLabel="label"
                                    optionValue="id"
                                    appendTo="body"
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
                           }
                        </div>
                     }
                  }
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
   private readonly _borrowers: LoanBorrowersService = inject(LoanBorrowersService);

   private readonly optionsCache: WeakMap<SidebarOption[], { profile: string | undefined; result: SidebarOption[] }> =
      new WeakMap();
   private readonly idsCache: Map<string, string[]> = new Map();
   private readonly datesCache: Map<string, Date[]> = new Map();
   private borrowersCache: { options: UserRow[]; ids: string[]; result: UserRow[] } | undefined;

   public readonly I18N = USERS_I18N_KEYS;
   public readonly LOANS = LOANS_I18N_KEYS;
   public readonly $searchingBorrowers: Signal<boolean> = computed(() => this._borrowers.searching);

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

      if (!options) return EMPTY_OPTIONS;

      // same array while nothing changes, a new one every time makes the selects write their value again & again
      const cached = this.optionsCache.get(options);

      if (cached && cached.profile === profile) return cached.result;

      const result: SidebarOption[] = options.filter((option: SidebarOption) => !!profile && option.allowed[profile]);

      this.optionsCache.set(options, { profile, result });

      return result;
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

   /**
    * Ids chosen in a list field (stored separated by comma)
    */
   public ids({ section, field }: { section: SidebarFiltersSection; field: SidebarField }): string[] {
      const value: string = this.value({ section, field });
      let ids: string[] | undefined = this.idsCache.get(value);

      // the same array for the same value, a new one every time makes the field write its value again & again
      if (!ids) {
         ids = value.split(',').filter((id: string) => id !== '');
         this.idsCache.set(value, ids);
      }

      return ids;
   }

   public handleList({
      section,
      field,
      ids,
   }: {
      section: SidebarFiltersSection;
      field: SidebarField;
      ids: string[] | null;
   }): void {
      this._sidebar.setValue({ section: section.id, field: field.id, value: (ids ?? []).join(',') });
   }

   /**
    * Texts (translation keys) of the options chosen, separated by comma
    */
   public labels({ field, ids }: { field: SidebarField; ids: string[] | null }): string {
      return (ids ?? [])
         .map((id: string) => field.options?.find((option: SidebarOption) => option.id === id)?.label ?? id)
         .join(', ');
   }

   /**
    * Borrowers of the list plus the ones already chosen, so they stay while the user searches
    */
   public borrowerOptions({ section, field }: { section: SidebarFiltersSection; field: SidebarField }): UserRow[] {
      const options: UserRow[] = this._borrowers.options;
      const ids: string[] = this.ids({ section, field });
      const cached = this.borrowersCache;

      if (cached && cached.options === options && cached.ids === ids) return cached.result;

      const chosen: UserRow[] = this._borrowers.byIds({ ids });
      const result: UserRow[] = [
         ...chosen.filter((user: UserRow) => !options.some((item: UserRow) => item.id === user.id)),
         ...options,
      ];

      this.borrowersCache = { options, ids, result };

      return result;
   }

   public borrowerNames({ ids }: { ids: string[] | null }): string {
      return this._borrowers
         .byIds({ ids: ids ?? [] })
         .map((user: UserRow) => user.fullname)
         .join(', ');
   }

   public handleBorrowerSearch(search: string | null | undefined): void {
      this._borrowers.search({ search: search ?? '' });
   }

   /**
    * Days of a date range field, stored as "YYYY-MM-DD,YYYY-MM-DD"
    */
   public dates({ section, field }: { section: SidebarFiltersSection; field: SidebarField }): Date[] | null {
      const value: string = this.value({ section, field });

      if (!value) return null;

      let dates: Date[] | undefined = this.datesCache.get(value);

      // the same dates for the same value, new ones every time make the calendar write its value again & again
      if (!dates) {
         const [from, to] = value.split(',');

         dates = to ? [this.toDate(from), this.toDate(to)] : [this.toDate(from)];
         this.datesCache.set(value, dates);
      }

      return dates;
   }

   public handleDates({
      section,
      field,
      dates,
   }: {
      section: SidebarFiltersSection;
      field: SidebarField;
      dates: (Date | null)[] | null;
   }): void {
      const [from, to] = dates ?? [];
      const value: string = from ? `${this.toIso(from)},${to ? this.toIso(to) : ''}` : '';

      this._sidebar.setValue({ section: section.id, field: field.id, value });
   }

   /**
    * Minimum (0) or maximum (1) of a range field, stored as "min,max"
    */
   public bound({
      section,
      field,
      index,
   }: {
      section: SidebarFiltersSection;
      field: SidebarField;
      index: number;
   }): number | null {
      const part: string | undefined = this.value({ section, field }).split(',')[index];

      return part ? Number(part) : null;
   }

   public handleBound({
      section,
      field,
      index,
      bound,
   }: {
      section: SidebarFiltersSection;
      field: SidebarField;
      index: number;
      bound: number | null;
   }): void {
      const parts: string[] = this.value({ section, field }).split(',');
      const next: string[] = [parts[0] ?? '', parts[1] ?? ''];

      next[index] = bound === null ? '' : `${bound}`;

      this._sidebar.setValue({ section: section.id, field: field.id, value: next[0] || next[1] ? next.join(',') : '' });
   }

   // local days, so the date isn't moved by the time zone
   private toIso(date: Date): string {
      const month: string = `${date.getMonth() + 1}`.padStart(2, '0');
      const day: string = `${date.getDate()}`.padStart(2, '0');

      return `${date.getFullYear()}-${month}-${day}`;
   }

   private toDate(value: string): Date {
      const [year, month, day] = value.split('-').map(Number);

      return new Date(year, month - 1, day);
   }
}
