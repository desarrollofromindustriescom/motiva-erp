import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { LoanDeposit } from '../../../../../../../interfaces/loan';
import {
   LOAN_DEPOSIT_TYPE_COLORS,
   LOAN_DEPOSIT_TYPE_I18N_KEYS,
   LOAN_DEPOSIT_STATUS_COLORS,
   LOAN_DEPOSIT_STATUS_I18N_KEYS,
   LOAN_PAYMENT_METHOD_COLORS,
   LOAN_PAYMENT_METHOD_I18N_KEYS,
   LOANS_I18N_KEYS,
} from '../../../../../../data/repository/loans.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanDepositAnswerService } from '../../../../../../data/services/loan-deposit-answer.service';
import { SessionService } from '../../../../../../data/services/session.service';
import { LoanReceiptViewService } from '../../../../../../data/services/loan-receipt-view.service';
import { LoanReceiptViewDialogComponent } from './loan-receipt-view.dialog.component';
import { LoanPaymentDepositsService } from '../../../../../../data/services/loan-payment-deposits.service';

/**
 * Payments made to a payment of a loan: date, type (regular, late or capital), how it was paid (cash or
 * transfer, with its receipt) & amount, with the sum of all of them (the total of what was paid to the payment) at the end
 */
@Component({
   selector: 'fi-loan-payment-deposits-dialog-component',
   imports: [NgTemplateOutlet, CurrencyPipe, DatePipe, TranslatePipe, TableModule, PaginatorModule],
   template: `
      <ng-template
         #rowActions
         let-deposit
      >
         @if (deposit.status === 'pending' && !$borrower) {
            <button
               class="mr-1 inline-flex cursor-pointer items-center justify-center rounded-md bg-green-600 px-2.5 py-1 text-sm text-white transition-all hover:bg-green-700"
               type="button"
               (click)="handleAnswer({ deposit, accept: true })"
            >
               {{ I18N.DEPOSIT_ACCEPT | translate }}
            </button>
            <button
               class="mr-1 inline-flex cursor-pointer items-center justify-center rounded-md bg-red-500 px-2.5 py-1 text-sm text-white transition-all hover:bg-red-600"
               type="button"
               (click)="handleAnswer({ deposit, accept: false })"
            >
               {{ I18N.DEPOSIT_REJECT | translate }}
            </button>
         }
         @if (deposit.has_ticket) {
            <button
               class="bg-second hover:bg-second-light focus:bg-second-light inline-flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1 text-sm text-white transition-all"
               type="button"
               (click)="handleReceipt({ deposit })"
            >
               {{ I18N.DEPOSITS_VIEW_RECEIPT | translate }}
            </button>
         }
      </ng-template>

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
                     <th class="max-sm:hidden">{{ I18N.DEPOSITS_HEAD_TYPE | translate }}</th>
                     <th class="max-sm:hidden">{{ I18N.DEPOSITS_HEAD_PAYMENT | translate }}</th>
                     <th>{{ I18N.DEPOSITS_HEAD_STATUS | translate }}</th>
                     <th class="text-right!">{{ I18N.DEPOSITS_HEAD_AMOUNT | translate }}</th>
                     <th class="max-sm:hidden"></th>
                  </tr>
               </ng-template>
               <ng-template
                  #body
                  let-deposit
               >
                  <tr class="max-sm:[&>td]:border-b-0!">
                     <td class="whitespace-nowrap">{{ deposit.date | date: 'dd.MM.yyyy' }}</td>
                     <td class="max-sm:hidden">
                        <span
                           class="rounded px-3 py-0.5 text-xs whitespace-nowrap text-white"
                           [class]="COLORS[deposit.type]"
                           >{{ TYPES[deposit.type] | translate }}</span
                        >
                     </td>
                     <td class="max-sm:hidden">
                        @if (deposit.payment) {
                           <span
                              class="rounded px-3 py-0.5 text-xs whitespace-nowrap text-white"
                              [class]="METHOD_COLORS[deposit.payment]"
                              >{{ METHODS[deposit.payment] | translate }}</span
                           >
                        } @else {
                           -
                        }
                     </td>
                     <td>
                        <span
                           class="rounded px-3 py-0.5 text-xs whitespace-nowrap text-white"
                           [class]="STATUS_COLORS[deposit.status]"
                           >{{ STATUSES[deposit.status] | translate }}</span
                        >
                     </td>
                     <td
                        class="text-right! whitespace-nowrap"
                        [class]="deposit.status === 'aproved' ? 'text-green-600' : 'text-slate-400'"
                        [class.line-through]="deposit.status === 'rejected'"
                     >
                        {{ deposit.amount | currency }}
                     </td>
                     <td class="text-right! whitespace-nowrap max-sm:hidden">
                        <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: deposit }" />
                     </td>
                  </tr>
                  <tr class="sm:hidden">
                     <td
                        colspan="6"
                        class="pt-0!"
                     >
                        <div class="flex flex-wrap items-center gap-1">
                           <span
                              class="rounded px-3 py-0.5 text-xs whitespace-nowrap text-white"
                              [class]="COLORS[deposit.type]"
                              >{{ TYPES[deposit.type] | translate }}</span
                           >
                           @if (deposit.payment) {
                              <span
                                 class="rounded px-3 py-0.5 text-xs whitespace-nowrap text-white"
                                 [class]="METHOD_COLORS[deposit.payment]"
                                 >{{ METHODS[deposit.payment] | translate }}</span
                              >
                           }
                           <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: deposit }" />
                        </div>
                     </td>
                  </tr>
               </ng-template>
               <ng-template #emptymessage>
                  <tr>
                     <td
                        class="py-6 text-center"
                        colspan="6"
                     >
                        {{ $loading() ? '' : (I18N.DEPOSITS_EMPTY | translate) }}
                     </td>
                  </tr>
               </ng-template>
               <ng-template #footer>
                  @if ($total() > 0) {
                     <tr>
                        <td class="font-bold">{{ I18N.DEPOSITS_TOTAL | translate }}</td>
                        <td class="max-sm:hidden"></td>
                        <td class="max-sm:hidden"></td>
                        <td></td>
                        <td class="text-right! font-bold whitespace-nowrap text-green-600">
                           {{ $sum() | currency }}
                        </td>
                        <td class="max-sm:hidden"></td>
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
   private readonly _receipt: LoanReceiptViewService = inject(LoanReceiptViewService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _answer: LoanDepositAnswerService = inject(LoanDepositAnswerService);
   private readonly _session: SessionService = inject(SessionService);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly TYPES: Record<string, string> = LOAN_DEPOSIT_TYPE_I18N_KEYS;
   public readonly COLORS: Record<string, string> = LOAN_DEPOSIT_TYPE_COLORS;
   public readonly STATUSES: Record<string, string> = LOAN_DEPOSIT_STATUS_I18N_KEYS;
   public readonly STATUS_COLORS: Record<string, string> = LOAN_DEPOSIT_STATUS_COLORS;
   // only the staff answers the pending payments
   public readonly $borrower: boolean = this._session.session?.profile === 'borrower';
   public readonly METHODS: Record<string, string> = LOAN_PAYMENT_METHOD_I18N_KEYS;
   public readonly METHOD_COLORS: Record<string, string> = LOAN_PAYMENT_METHOD_COLORS;
   public readonly skeletons: number[] = [1, 2, 3, 4];
   public readonly $size: number = this._deposits.size;

   public readonly $ready: Signal<boolean> = computed(() => this._deposits.ready);
   public readonly $deposits: Signal<LoanDeposit[]> = computed(() => this._deposits.deposits);
   public readonly $loading: Signal<boolean> = computed(() => this._deposits.loading);
   public readonly $total: Signal<number> = computed(() => this._deposits.total);
   public readonly $sum: Signal<number> = computed(() => this._deposits.sum);
   public readonly $page: Signal<number> = computed(() => this._deposits.page);

   /**
    * Opens the image of the receipt of a transfer over this table
    */
   public handleReceipt({ deposit }: { deposit: LoanDeposit }): void {
      const { loanId, paymentId } = this._deposits.current;

      if (!loanId || !paymentId) return;

      this._receipt.open({ loanId, paymentId, depositId: deposit.id });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.LOAN_RECEIPT_TITLE,
         component: LoanReceiptViewDialogComponent,
         size: 'sm',
      });
   }

   /**
    * Accepts or rejects a payment that a borrower reported
    */
   public handleAnswer({ deposit, accept }: { deposit: LoanDeposit; accept: boolean }): void {
      const { loanId, paymentId } = this._deposits.current;

      if (!loanId || !paymentId || this.$borrower) return;

      this._answer.answer({ loanId, paymentId, depositId: deposit.id, accept });
   }

   public handlePage(event: PaginatorState): void {
      this._deposits.changePage({ page: (event.page ?? 0) + 1 });
   }
}
