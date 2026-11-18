import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { LoanPaymentBreakdownDialogComponent } from './loan-payment-breakdown.dialog.component';
import { LoanPaymentDepositsDialogComponent } from './loan-payment-deposits.dialog.component';
import { LoanPaymentPayDialogComponent } from './loan-payment-pay.dialog.component';
import { LoanPayment } from '../../../../../../../interfaces/loan';
import {
   LOAN_PAYMENT_ACTIONS,
   LOAN_PAYMENT_STYLES,
   LOANS_I18N_KEYS,
} from '../../../../../../data/repository/loans.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanPaymentBreakdownService } from '../../../../../../data/services/loan-payment-breakdown.service';
import { LoanPaymentVisitService } from '../../../../../../data/services/loan-payment-visit.service';
import { LoanPaymentDepositsService } from '../../../../../../data/services/loan-payment-deposits.service';
import { LoanPaymentPayService } from '../../../../../../data/services/loan-payment-pay.service';
import { LoanPaymentsService } from '../../../../../../data/services/loan-payments.service';

/**
 * Payments of a loan as cards, the color of each one is its state: paid (green),
 * expired (red), partially paid (blue), pending (gray) & paid to capital (orange).
 * The expected date is always shown & the payment date only on the ones paid in full.
 * Every payment has actions, the ones paid in full only some of them. Pay, payments made, visit & breakdown are available.
 */
@Component({
   selector: 'fi-loan-payments-dialog-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, TooltipModule],
   template: `
      @let payments = $payments();

      @if (payments) {
         @if (payments.length === 0) {
            <p class="w-full py-6 text-center text-slate-500">{{ I18N.PAYMENT_EMPTY | translate }}</p>
         } @else {
            <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
               @for (payment of payments; track payment.id) {
                  <article
                     class="flex min-h-28 flex-col justify-between gap-2 rounded-xl border-2 p-3"
                     [class]="STYLES[payment.state].card"
                  >
                     <div class="flex flex-col text-xs">
                        <span
                           >{{ I18N.PAYMENT_EXPECTED | translate }}:
                           {{ payment.expected_date | date: 'dd.MM.yyyy' }}</span
                        >
                        @if (payment.paid_date) {
                           <span
                              >{{ I18N.PAYMENT_PAID_DATE | translate }}:
                              {{ payment.paid_date | date: 'dd.MM.yyyy' }}</span
                           >
                        }
                     </div>

                     <div class="flex items-end justify-between gap-2">
                        <div class="flex gap-1">
                           @for (action of actions(payment); track action.id) {
                              <button
                                 class="flex cursor-pointer items-center justify-center rounded-md p-1 text-white transition-all disabled:cursor-auto disabled:opacity-40"
                                 type="button"
                                 tooltipPosition="top"
                                 [class]="STYLES[payment.state].button"
                                 [pTooltip]="action.tooltip | translate"
                                 [showDelay]="1500"
                                 [disabled]="!enabled({ action, payment })"
                                 (click)="handleAction({ action, payment })"
                              >
                                 <i [class]="'bx text-base ' + action.icon"></i>
                              </button>
                           }
                        </div>

                        <div class="flex flex-col items-end">
                           <span class="text-lg"># {{ payment.number }}</span>
                           <span class="text-xl font-bold">{{ payment.amount | currency }}</span>
                        </div>
                     </div>
                  </article>
               }
            </div>
         }
      } @else {
         <div class="grid w-full animate-pulse grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (item of skeletons; track item) {
               <div class="h-28 w-full rounded-xl bg-slate-300"></div>
            }
         </div>
      }
   `,
})
export class LoanPaymentsDialogComponent {
   private readonly _payments: LoanPaymentsService = inject(LoanPaymentsService);
   private readonly _pay: LoanPaymentPayService = inject(LoanPaymentPayService);
   private readonly _deposits: LoanPaymentDepositsService = inject(LoanPaymentDepositsService);
   private readonly _breakdown: LoanPaymentBreakdownService = inject(LoanPaymentBreakdownService);
   private readonly _visit: LoanPaymentVisitService = inject(LoanPaymentVisitService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly STYLES = LOAN_PAYMENT_STYLES;
   public readonly ACTIONS = LOAN_PAYMENT_ACTIONS;
   public readonly PAID_ACTIONS = LOAN_PAYMENT_ACTIONS.filter((action) => action.paid);
   public readonly skeletons: number[] = [1, 2, 3, 4, 5, 6];

   public readonly $payments: Signal<LoanPayment[] | undefined> = computed(() => this._payments.payments);

   /**
    * Every payment has its actions, the ones paid in full only have some of them
    */
   public actions(payment: LoanPayment): typeof LOAN_PAYMENT_ACTIONS {
      const paid: boolean = payment.state === 'paid' || payment.state === 'capital';

      return paid ? this.PAID_ACTIONS : this.ACTIONS;
   }

   /**
    * Paying is only possible on the next payment, the ones after it have to wait
    */
   public enabled({ action, payment }: { action: { id: string }; payment: LoanPayment }): boolean {
      // paying & visiting are only possible on the current payment (the first that isn't paid in full)
      return !['pay', 'visit'].includes(action.id) || payment.is_next;
   }

   public handleAction({ action, payment }: { action: { id: string }; payment: LoanPayment }): void {
      const loanId: string | null = this._payments.id;

      if (!loanId) return;

      if (action.id === 'settle') {
         this._deposits.open({ loanId, paymentId: payment.id });
         this._dialogs.newDialog({
            title: DIALOG_I18N_KEYS.LOAN_DEPOSITS_TITLE,
            titleParams: { number: `${payment.number}`, folio: this._payments.folio },
            component: LoanPaymentDepositsDialogComponent,
            size: 'sm',
         });

         return;
      }

      if (action.id === 'details') {
         this._breakdown.open({ loanId, paymentId: payment.id });
         this._dialogs.newDialog({
            title: DIALOG_I18N_KEYS.LOAN_BREAKDOWN_TITLE,
            titleParams: { number: `${payment.number}`, folio: this._payments.folio },
            component: LoanPaymentBreakdownDialogComponent,
            size: 'sm',
         });

         return;
      }

      if (action.id === 'visit') {
         if (payment.is_next) this._visit.add({ loanId, paymentId: payment.id });

         return;
      }

      if (action.id !== 'pay' || !payment.is_next) return;

      this._pay.start({ loanId, payment });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.LOAN_PAYMENT_PAY_TITLE,
         titleParams: { number: `${payment.number}` },
         component: LoanPaymentPayDialogComponent,
         size: 'sm',
      });
   }
}
