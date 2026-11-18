import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CalendarDay } from '../../../../../../../interfaces/loan';
import { LOAN_WEEKDAYS, LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { LoansCalendarService } from '../../../../../../data/services/loans-calendar.service';
import { LoaderComponent } from '../../../forms/loader/loader.component';
import { PhoneFormatPipe } from '../../../../../utilities/pipes/phone-format.pipe';

/**
 * Calendar of payments: the active loans grouped by the weekday of their current payment, one
 * panel for each day (Sunday only shows up when a loan has its payment that day). Every loan
 * shows what its current payment owes, what the whole loan owes, its pay day & the borrower and its guarantee.
 */
@Component({
   selector: 'fi-loans-calendar-dialog-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, LoaderComponent],
   template: `
      @let days = $days();

      @if (days) {
         <div class="flex w-full flex-col gap-3">
            @for (day of days; track day.weekday) {
               <section class="border-second flex w-full flex-col rounded-xl border-2">
                  <button
                     class="text-second flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left"
                     type="button"
                     [attr.aria-expanded]="isOpen(day)"
                     (click)="handleToggle(day)"
                  >
                     <span class="flex items-center gap-2">
                        <span>{{ WEEKDAYS[day.weekday - 1] | translate }}</span>
                        @if (day.items.length > 0) {
                           <span class="bg-second rounded-full px-2 py-0.5 text-xs text-white">{{
                              day.items.length
                           }}</span>
                        }
                     </span>
                     <i
                        class="bx bx-chevron-down text-2xl transition-transform"
                        [class.rotate-180]="isOpen(day)"
                     ></i>
                  </button>

                  @if (isOpen(day)) {
                     <div class="w-full overflow-x-auto px-4 pb-3">
                        @if (day.items.length === 0) {
                           <p class="py-3 text-sm text-slate-500">{{ I18N.CALENDAR_EMPTY_DAY | translate }}</p>
                        } @else {
                           <table class="w-full min-w-240 text-sm">
                              <thead>
                                 <tr class="text-second border-b border-slate-300 text-left">
                                    <th class="px-1 py-2 font-medium">{{ I18N.CALENDAR_HEAD_BORROWER | translate }}</th>
                                    <th class="px-1 py-2 text-right font-medium">
                                       {{ I18N.CALENDAR_HEAD_AMOUNT | translate }}
                                    </th>
                                    <th class="px-1 py-2 text-right font-medium">
                                       {{ I18N.CALENDAR_HEAD_DEBT | translate }}
                                    </th>
                                    <th class="px-1 py-2 font-medium">{{ I18N.CALENDAR_HEAD_PAY_DAY | translate }}</th>
                                    <th class="px-1 py-2 font-medium">{{ I18N.CALENDAR_HEAD_DATE | translate }}</th>
                                    <th class="px-1 py-2 font-medium">{{ I18N.CALENDAR_HEAD_PHONE | translate }}</th>
                                    <th class="px-1 py-2 font-medium">
                                       {{ I18N.CALENDAR_HEAD_GUARANTOR | translate }}
                                    </th>
                                    <th class="px-1 py-2 font-medium">{{ I18N.CALENDAR_HEAD_PHONE | translate }}</th>
                                    <th class="px-1 py-2 font-medium">{{ I18N.CALENDAR_HEAD_STATUS | translate }}</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 @for (item of day.items; track item.loan_id) {
                                    <tr class="text-second/80 border-b border-slate-300">
                                       <td class="px-1 py-1.5">{{ item.borrower }}</td>
                                       <td class="px-1 py-1.5 text-right whitespace-nowrap text-green-600">
                                          {{ item.amount | currency }}
                                       </td>
                                       <td class="px-1 py-1.5 text-right whitespace-nowrap text-green-600">
                                          {{ item.total_debt | currency }}
                                       </td>
                                       <td class="px-1 py-1.5 whitespace-nowrap">
                                          @if (item.pay_day_type === 'monthly') {
                                             {{ I18N.CALENDAR_MONTHLY_DAY | translate: { day: pad(item.pay_day) } }}
                                          } @else if (item.pay_day_type === 'biweekly') {
                                             {{
                                                I18N.CALENDAR_BIWEEKLY_DAY
                                                   | translate: { day: (WEEKDAYS[item.pay_day - 1] | translate) }
                                             }}
                                          } @else {
                                             {{ WEEKDAYS[item.pay_day - 1] | translate }}
                                          }
                                       </td>
                                       <td class="px-1 py-1.5 whitespace-nowrap">
                                          {{ item.expected_date | date: 'dd.MM.yyyy' }}
                                       </td>
                                       <td class="px-1 py-1.5 whitespace-nowrap">{{ phone(item.borrower_phone) }}</td>
                                       <td class="px-1 py-1.5">{{ item.guarantor || '-' }}</td>
                                       <td class="px-1 py-1.5 whitespace-nowrap">{{ phone(item.guarantor_phone) }}</td>
                                       <td class="px-1 py-1.5">
                                          <span
                                             class="rounded px-2 py-0.5 text-xs whitespace-nowrap text-white"
                                             [class]="item.overdue ? 'bg-red-500' : 'bg-green-500'"
                                             >{{
                                                (item.overdue ? I18N.CALENDAR_OVERDUE : I18N.CALENDAR_CURRENT)
                                                   | translate
                                             }}</span
                                          >
                                       </td>
                                    </tr>
                                 }
                              </tbody>
                           </table>
                        }
                     </div>
                  }
               </section>
            }

            <div class="flex w-full justify-end pt-1">
               <button
                  class="bg-second hover:bg-second-light focus:bg-second-light flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
                  type="button"
                  [disabled]="$downloading()"
                  (click)="handleExcel()"
               >
                  @if ($downloading()) {
                     <fi-loader-component tone="white" />
                  } @else {
                     <i class="bx bx-table text-xl"></i>
                  }
                  {{ I18N.CALENDAR_EXCEL | translate }}
               </button>
            </div>
         </div>
      } @else {
         <div class="flex w-full animate-pulse flex-col gap-3">
            @for (item of skeletons; track item) {
               <div class="h-14 w-full rounded-xl bg-slate-300"></div>
            }
         </div>
      }
   `,
})
export class LoansCalendarDialogComponent {
   private readonly _calendar: LoansCalendarService = inject(LoansCalendarService);

   private readonly phoneFormat: PhoneFormatPipe = new PhoneFormatPipe();

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly WEEKDAYS: string[] = LOAN_WEEKDAYS;
   public readonly skeletons: number[] = [1, 2, 3, 4, 5, 6];
   public readonly $downloading: Signal<boolean> = computed(() => this._calendar.downloading);

   // the days that are open: the first day with loans is open from the start
   private readonly $open: WritableSignal<Set<number> | null> = signal(null);

   // Monday to Saturday always, Sunday only when a loan has its payment that day
   public readonly $days: Signal<CalendarDay[] | undefined> = computed(() => {
      const days: CalendarDay[] | undefined = this._calendar.days;

      return days?.filter((day: CalendarDay) => day.weekday !== 7 || day.items.length > 0);
   });

   public isOpen(day: CalendarDay): boolean {
      return (this.$open() ?? new Set(this.firstOpen())).has(day.weekday);
   }

   public handleToggle(day: CalendarDay): void {
      const open: Set<number> = new Set(this.$open() ?? this.firstOpen());

      if (open.has(day.weekday)) open.delete(day.weekday);
      else open.add(day.weekday);

      this.$open.set(open);
   }

   public handleExcel(): void {
      this._calendar.downloadExcel();
   }

   // the day of the month with two digits: 03
   public pad(value: number): string {
      return `${value}`.padStart(2, '0');
   }

   public phone(value: string | null): string {
      return value ? this.phoneFormat.transform(value, ' ') : '-';
   }

   private firstOpen(): number[] {
      const first: number | undefined = this.$days()?.find((item: CalendarDay) => item.items.length > 0)?.weekday;

      return first ? [first] : [];
   }
}
