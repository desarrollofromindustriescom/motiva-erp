import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BorrowerSummary, LoanRow } from '../../../../../../../../interfaces/loan';
import { compactFolio } from '../../../../../../../data/repository/cash-balance.repository';
import { DASHBOARD_I18N_KEYS } from '../../../../../../../data/repository/dashboard.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../../data/repository/dialog.repository';
import { LOAN_WEEKDAYS } from '../../../../../../../data/repository/loans.repository';
import { BorrowerPanelService } from '../../../../../../../data/services/borrower-panel.service';
import { DialogsService } from '../../../../../../../data/services/dialogs.service';
import { LoanDetailService } from '../../../../../../../data/services/loan-detail.service';
import { LoanPaymentsService } from '../../../../../../../data/services/loan-payments.service';
import { LoanDetailDialogComponent } from '../../../../../common/dialogs/views/loans/loan-detail.dialog.component';
import { LoanPaymentsDialogComponent } from '../../../../../common/dialogs/views/loans/loan-payments.dialog.component';
import { BorrowerLoansTableComponent } from './borrower-loans-table.component';

/**
 * Panel of the borrower: its next payment, the day it pays, what it owes, the payments it has left
 * & its active loans, with the table of its loans (detail of each one & its payments)
 */
@Component({
   selector: 'fi-borrower-dashboard-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, BorrowerLoansTableComponent],
   host: { class: 'flex flex-col gap-2' },
   template: `
      @let summary = $summary();

      @if (summary) {
         <section
            class="bg-main flex w-full flex-col gap-4 rounded-2xl p-4 sm:p-6 md:flex-row md:justify-between md:gap-6"
         >
            <div class="flex min-w-0 flex-col justify-between gap-4">
               <h2 class="text-xl font-bold text-white sm:text-2xl">{{ I18N.NEXT_PAYMENT | translate }}</h2>

               @if (summary.next_payment; as next) {
                  <div class="flex min-w-0 flex-col">
                     <span class="text-3xl font-bold wrap-anywhere text-white sm:text-4xl">{{
                        next.amount | currency
                     }}</span>
                     <span class="text-xs text-white">
                        {{ I18N.NEXT_DATE | translate: { date: (next.expected_date | date: 'dd.MM.yyyy') } }}
                     </span>
                  </div>
               } @else {
                  <span class="text-xl text-white">{{ I18N.NO_NEXT_PAYMENT | translate }}</span>
               }
            </div>

            <dl class="flex flex-col gap-0.5 text-sm text-white md:items-end md:text-right">
               <div class="flex gap-1">
                  <dt>{{ I18N.PAY_DAY | translate }}:</dt>
                  <dd class="font-bold">
                     @if (summary.next_payment; as next) {
                        @if (next.pay_day_type !== 'monthly') {
                           {{ WEEKDAYS[next.pay_day - 1] | translate }}
                        } @else {
                           {{ I18N.PAY_DAY_MONTHLY | translate: { day: next.pay_day } }}
                        }
                     } @else {
                        -
                     }
                  </dd>
               </div>
               <div class="flex gap-1">
                  <dt>{{ I18N.TOTAL_DEBT | translate }}:</dt>
                  <dd class="font-bold">{{ summary.total_debt | currency }}</dd>
               </div>
               <div class="flex gap-1">
                  <dt>{{ I18N.REMAINING_PAYMENTS | translate }}:</dt>
                  <dd class="font-bold">{{ summary.remaining_payments }}</dd>
               </div>
               <div class="flex gap-1">
                  <dt>{{ I18N.ACTIVE_LOANS | translate }}:</dt>
                  <dd class="font-bold">{{ summary.active_loans }}</dd>
               </div>
            </dl>
         </section>
      } @else {
         <div class="h-40 w-full animate-pulse rounded-2xl bg-slate-300"></div>
      }

      <fi-borrower-loans-table-component
         class="flex flex-auto flex-col"
         (details)="handleDetails({ loan: $event })"
         (payments)="handlePayments({ loan: $event })"
      />
   `,
})
export class BorrowerDashboardComponent {
   private readonly _panel: BorrowerPanelService = inject(BorrowerPanelService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _detail: LoanDetailService = inject(LoanDetailService);
   private readonly _payments: LoanPaymentsService = inject(LoanPaymentsService);

   public readonly I18N = DASHBOARD_I18N_KEYS;
   // the day of the next payment is the weekday of a weekly or biweekly loan or the day of the month of a monthly one
   public readonly WEEKDAYS: string[] = LOAN_WEEKDAYS;

   public readonly $summary: Signal<BorrowerSummary | undefined> = computed(() => this._panel.summary);

   public handleDetails({ loan }: { loan: LoanRow }): void {
      this._detail.open({ id: loan.id });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.LOAN_DETAIL_TITLE,
         titleParams: { folio: compactFolio(loan.folio) },
         component: LoanDetailDialogComponent,
         size: 'sm',
      });
   }

   public handlePayments({ loan }: { loan: LoanRow }): void {
      this._payments.open({ id: loan.id, folio: compactFolio(loan.folio), kind: loan.kind });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.LOAN_PAYMENTS_TITLE,
         titleParams: { folio: compactFolio(loan.folio) },
         component: LoanPaymentsDialogComponent,
         size: 'lg',
      });
   }
}
