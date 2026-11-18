import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { LoanDeposit } from '../../../../../../../interfaces/loan';
import {
   LOAN_DEPOSIT_TYPE_COLORS,
   LOAN_DEPOSIT_TYPE_I18N_KEYS,
   LOANS_I18N_KEYS,
} from '../../../../../../data/repository/loans.repository';
import { LoanPaymentDepositsService } from '../../../../../../data/services/loan-payment-deposits.service';

/**
 * Payments made to a payment of a loan: date, type (regular, late or capital) & amount,
 * with the sum of all of them (the total of what was paid to the payment) at the end
 */
@Component({
   selector: 'fi-loan-payment-deposits-dialog-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, TableModule, PaginatorModule],
   template: `
      @if ($ready()) {
         <div class="flex w-full flex-col gap-2">
            <p-table
               class="block w-full max-sm:[&_td]:px-2! max-sm:[&_th]:px-2!"
               [value]="$deposits()"
               [loading]="$loading()"
            >
               <ng-template #header>
                  <tr>
                     <th>{{ I18N.DEPOSITS_HEAD_DATE | translate }}</th>
                     <th>{{ I18N.DEPOSITS_HEAD_TYPE | translate }}</th>
                     <th class="text-right!">{{ I18N.DEPOSITS_HEAD_AMOUNT | translate }}</th>
                  </tr>
               </ng-template>
               <ng-template
                  #body
                  let-deposit
               >
                  <tr>
                     <td class="whitespace-nowrap">{{ deposit.date | date: 'dd.MM.yyyy' }}</td>
                     <td>
                        <span
                           class="rounded px-3 py-0.5 text-xs whitespace-nowrap text-white"
                           [class]="COLORS[deposit.type]"
                           >{{ TYPES[deposit.type] | translate }}</span
                        >
                     </td>
                     <td class="text-right! whitespace-nowrap text-green-600">{{ deposit.amount | currency }}</td>
                  </tr>
               </ng-template>
               <ng-template #emptymessage>
                  <tr>
                     <td
                        class="py-6 text-center"
                        colspan="3"
                     >
                        {{ $loading() ? '' : (I18N.DEPOSITS_EMPTY | translate) }}
                     </td>
                  </tr>
               </ng-template>
               <ng-template #footer>
                  @if ($total() > 0) {
                     <tr>
                        <td class="font-bold">{{ I18N.DEPOSITS_TOTAL | translate }}</td>
                        <td></td>
                        <td class="text-right! font-bold whitespace-nowrap text-green-600">
                           {{ $sum() | currency }}
                        </td>
                     </tr>
                  }
               </ng-template>
            </p-table>

            @if ($total() > $size) {
               <p-paginator
                  class="w-full"
                  [first]="($page() - 1) * $size"
                  [rows]="$size"
                  [totalRecords]="$total()"
                  [showFirstLastIcon]="true"
                  [pageLinkSize]="3"
                  (onPageChange)="handlePage($event)"
               />
            }
         </div>
      } @else {
         <div class="flex w-full animate-pulse flex-col gap-3">
            @for (item of skeletons; track item) {
               <div class="h-7 w-full rounded-md bg-slate-300"></div>
            }
         </div>
      }
   `,
})
export class LoanPaymentDepositsDialogComponent {
   private readonly _deposits: LoanPaymentDepositsService = inject(LoanPaymentDepositsService);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly TYPES: Record<string, string> = LOAN_DEPOSIT_TYPE_I18N_KEYS;
   public readonly COLORS: Record<string, string> = LOAN_DEPOSIT_TYPE_COLORS;
   public readonly skeletons: number[] = [1, 2, 3, 4];
   public readonly $size: number = this._deposits.size;

   public readonly $ready: Signal<boolean> = computed(() => this._deposits.ready);
   public readonly $deposits: Signal<LoanDeposit[]> = computed(() => this._deposits.deposits);
   public readonly $loading: Signal<boolean> = computed(() => this._deposits.loading);
   public readonly $total: Signal<number> = computed(() => this._deposits.total);
   public readonly $sum: Signal<number> = computed(() => this._deposits.sum);
   public readonly $page: Signal<number> = computed(() => this._deposits.page);

   public handlePage(event: PaginatorState): void {
      this._deposits.changePage({ page: (event.page ?? 0) + 1 });
   }
}
