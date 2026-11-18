import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LoanBreakdown, LoanExtra } from '../../../../../../../interfaces/loan';
import { LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { LoanPaymentBreakdownService } from '../../../../../../data/services/loan-payment-breakdown.service';

interface BreakdownRow {
   label: string;
   // the base payment & the extras that don't cost the same have no unit price
   unit: number | null;
   quantity: number | null;
   total: number;
}

/**
 * What a payment is made of: the base payment plus its extras (mora, one for every week of delay,
 * & visits), each one with what it costs, how many there are & what they add up to, & the total
 */
@Component({
   selector: 'fi-loan-payment-breakdown-dialog-component',
   imports: [CurrencyPipe, TranslatePipe],
   template: `
      @let breakdown = $breakdown();

      @if (breakdown) {
         <table class="w-full text-sm">
            <thead>
               <tr class="text-second border-b border-slate-300 text-left">
                  <th class="px-1 py-2 font-medium">{{ I18N.BREAKDOWN_HEAD_CONCEPT | translate }}</th>
                  <th class="px-1 py-2 text-right font-medium">{{ I18N.BREAKDOWN_HEAD_UNIT | translate }}</th>
                  <th class="px-1 py-2 text-right font-medium">{{ I18N.BREAKDOWN_HEAD_QUANTITY | translate }}</th>
                  <th class="px-1 py-2 text-right font-medium">{{ I18N.BREAKDOWN_HEAD_TOTAL | translate }}</th>
               </tr>
            </thead>
            <tbody>
               @for (row of $rows(); track row.label) {
                  <tr class="text-second/70 border-b border-slate-300">
                     <td class="px-1 py-1.5">{{ row.label | translate }}</td>
                     <td class="px-1 py-1.5 text-right whitespace-nowrap">
                        {{ row.unit === null ? '-' : (row.unit | currency) }}
                     </td>
                     <td class="px-1 py-1.5 text-right">{{ row.quantity ?? '-' }}</td>
                     <td class="px-1 py-1.5 text-right whitespace-nowrap">{{ row.total | currency }}</td>
                  </tr>
               }
            </tbody>
            <tfoot>
               <tr class="text-second border-b border-slate-300 font-bold">
                  <td
                     class="px-1 py-1.5"
                     colspan="3"
                  >
                     {{ I18N.BREAKDOWN_TOTAL | translate }}
                  </td>
                  <td class="px-1 py-1.5 text-right whitespace-nowrap">{{ breakdown.total | currency }}</td>
               </tr>
            </tfoot>
         </table>
      } @else {
         <div class="flex w-full animate-pulse flex-col gap-3">
            @for (item of skeletons; track item) {
               <div class="h-7 w-full rounded-md bg-slate-300"></div>
            }
         </div>
      }
   `,
})
export class LoanPaymentBreakdownDialogComponent {
   private readonly _breakdown: LoanPaymentBreakdownService = inject(LoanPaymentBreakdownService);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly skeletons: number[] = [1, 2, 3];

   public readonly $breakdown: Signal<LoanBreakdown | undefined> = computed(() => this._breakdown.breakdown);

   // the extras only show up when the payment has them
   public readonly $rows: Signal<BreakdownRow[]> = computed(() => {
      const breakdown: LoanBreakdown | undefined = this.$breakdown();

      if (!breakdown) return [];

      const rows: BreakdownRow[] = [
         { label: LOANS_I18N_KEYS.BREAKDOWN_BASE, unit: null, quantity: null, total: breakdown.base },
      ];

      const extras: [string, LoanExtra | null][] = [
         [LOANS_I18N_KEYS.BREAKDOWN_MORA, breakdown.mora],
         [LOANS_I18N_KEYS.BREAKDOWN_VISITS, breakdown.visits],
      ];

      for (const [label, extra] of extras) {
         if (extra) rows.push({ label, unit: extra.unit, quantity: extra.quantity, total: extra.total });
      }

      return rows;
   });
}
