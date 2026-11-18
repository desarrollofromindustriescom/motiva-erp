import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LoanDetail, LoanLender } from '../../../../../../../interfaces/loan';
import { LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanPaymentsService } from '../../../../../../data/services/loan-payments.service';
import { LoanDetailService } from '../../../../../../data/services/loan-detail.service';
import { LoanPaymentsDialogComponent } from './loan-payments.dialog.component';
import { PhoneFormatPipe } from '../../../../../utilities/pipes/phone-format.pipe';

interface DetailRow {
   label: string;
   value: string | null;
   // the value is a translation key
   translate?: boolean;
}

interface DetailSection {
   // translation key & its params, the first section has no title
   title?: string;
   params?: Record<string, string>;
   // amounts are aligned to the right
   amounts: boolean;
   rows: DetailRow[];
}

/**
 * Detail of a loan: its terms, what has been paid back (in total & for every place that
 * lent money to it) & the information of the borrower & the lenders
 */
@Component({
   selector: 'fi-loan-detail-dialog-component',
   imports: [TranslatePipe],
   template: `
      @if ($loan()) {
         <div class="flex w-full flex-col gap-5">
            @for (section of $sections(); track $index) {
               <section class="flex w-full flex-col gap-1">
                  @if (section.title) {
                     <h3 class="text-second text-sm font-medium">{{ section.title | translate: section.params }}</h3>
                  }

                  <dl class="flex w-full flex-col">
                     @for (row of section.rows; track row.label) {
                        <div
                           class="flex flex-col gap-0.5 border-b border-slate-300 px-1 py-1.5 text-sm sm:grid sm:gap-2"
                           [class]="section.amounts ? 'sm:grid-cols-[1fr_auto]' : 'sm:grid-cols-[10rem_1fr]'"
                        >
                           <dt class="text-second">{{ row.label | translate }}:</dt>
                           <dd
                              class="text-second/70 wrap-anywhere"
                              [class.sm:text-right]="section.amounts"
                           >
                              @if (row.translate && row.value) {
                                 {{ row.value | translate }}
                              } @else {
                                 {{ row.value || '-' }}
                              }
                           </dd>
                        </div>
                     }
                  </dl>
               </section>
            }

            <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
               <button
                  class="bg-second hover:bg-second-light focus:bg-second-light flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white transition-all"
                  type="button"
               >
                  <i class="bx bx-dollar text-xl"></i>
                  {{ I18N.BUTTON_PAY | translate }}
               </button>
               <button
                  class="bg-second hover:bg-second-light focus:bg-second-light flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white transition-all"
                  type="button"
                  (click)="handlePayments()"
               >
                  <i class="bx bx-wallet text-xl"></i>
                  {{ I18N.BUTTON_PAYMENTS | translate }}
               </button>
            </div>
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
export class LoanDetailDialogComponent {
   private readonly _detail: LoanDetailService = inject(LoanDetailService);
   private readonly _payments: LoanPaymentsService = inject(LoanPaymentsService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   private readonly currency: CurrencyPipe = new CurrencyPipe('en-US');
   private readonly date: DatePipe = new DatePipe('en-US');
   private readonly number: DecimalPipe = new DecimalPipe('en-US');
   private readonly phone: PhoneFormatPipe = new PhoneFormatPipe();

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly skeletons: number[] = [1, 2, 3, 4, 5, 6, 7, 8];

   public readonly $loan: Signal<LoanDetail | undefined> = computed(() => this._detail.detail);

   public readonly $sections: Signal<DetailSection[]> = computed(() => {
      const loan: LoanDetail | undefined = this.$loan();

      if (!loan) return [];

      const sections: DetailSection[] = [
         {
            amounts: false,
            rows: [
               { label: LOANS_I18N_KEYS.DETAIL_FOLIO, value: loan.folio },
               { label: LOANS_I18N_KEYS.DETAIL_RATE, value: `${this.number.transform(loan.rate, '1.0-3')}%` },
               {
                  label: LOANS_I18N_KEYS.DETAIL_TYPE,
                  value:
                     loan.type === 'weekly' ? LOANS_I18N_KEYS.DETAIL_TYPE_WEEKLY : LOANS_I18N_KEYS.DETAIL_TYPE_MONTHLY,
                  translate: true,
               },
               { label: LOANS_I18N_KEYS.DETAIL_PAYMENTS, value: `${loan.no_payments}` },
               { label: LOANS_I18N_KEYS.DETAIL_FULFILLED, value: `${loan.fulfilled_payments}` },
               { label: LOANS_I18N_KEYS.DETAIL_REQUESTED, value: this.date.transform(loan.request_date, 'dd.MM.yyyy') },
               {
                  label: LOANS_I18N_KEYS.DETAIL_APPROVED,
                  value: loan.resolution_date ? this.date.transform(loan.resolution_date, 'dd.MM.yyyy') : null,
               },
            ],
         },
         {
            title: LOANS_I18N_KEYS.DETAIL_SECTION_TOTAL,
            amounts: true,
            rows: [
               { label: LOANS_I18N_KEYS.DETAIL_LENT, value: this.money(loan.amount) },
               { label: LOANS_I18N_KEYS.DETAIL_DEBT, value: this.money(loan.total) },
               { label: LOANS_I18N_KEYS.DETAIL_PAID_CAPITAL, value: this.money(loan.paid_capital) },
               { label: LOANS_I18N_KEYS.DETAIL_PAID_INTEREST, value: this.money(loan.paid_interest) },
               { label: LOANS_I18N_KEYS.DETAIL_CURRENT, value: this.money(loan.current) },
            ],
         },
      ];

      // the general cash balance: its own share of the payments & the commission of the investors
      if (loan.general) {
         sections.push({
            title: LOANS_I18N_KEYS.DETAIL_SECTION_GENERAL,
            amounts: true,
            rows: [
               { label: LOANS_I18N_KEYS.DETAIL_LENT, value: this.money(loan.general.lent) },
               { label: LOANS_I18N_KEYS.DETAIL_DEBT, value: this.money(loan.general.debt) },
               { label: LOANS_I18N_KEYS.DETAIL_PAID, value: this.money(loan.general.paid) },
               { label: LOANS_I18N_KEYS.DETAIL_COMMISSION_RECEIVED, value: this.money(loan.general.commission) },
               { label: LOANS_I18N_KEYS.DETAIL_CURRENT, value: this.money(loan.general.received) },
            ],
         });
      }

      // an investor receives part of its share of every payment, the rest is commission
      for (const investor of loan.investors) {
         sections.push({
            title: LOANS_I18N_KEYS.DETAIL_SECTION_INVESTOR,
            params: { name: investor.fullname ?? '' },
            amounts: true,
            rows: [
               { label: LOANS_I18N_KEYS.DETAIL_LENT, value: this.money(investor.lent) },
               { label: LOANS_I18N_KEYS.DETAIL_DEBT, value: this.money(investor.debt) },
               { label: LOANS_I18N_KEYS.DETAIL_PAID, value: this.money(investor.paid) },
               { label: LOANS_I18N_KEYS.DETAIL_RECEIVED_INVESTOR, value: this.money(investor.received) },
               { label: LOANS_I18N_KEYS.DETAIL_COMMISSION_KEPT, value: this.money(investor.commission) },
            ],
         });
      }

      sections.push({
         title: LOANS_I18N_KEYS.DETAIL_SECTION_BORROWER,
         amounts: false,
         rows: [
            { label: USERS_I18N_KEYS.DETAIL_NAME, value: loan.borrower.fullname },
            { label: USERS_I18N_KEYS.DETAIL_PHONE, value: this.formatPhone(loan.borrower.phone_number) },
            { label: USERS_I18N_KEYS.DETAIL_CURP, value: loan.borrower.curp },
            { label: USERS_I18N_KEYS.DETAIL_ADDRESS, value: loan.borrower.address },
         ],
      });

      // one block for every investor that lent money
      loan.investors.forEach((investor: LoanLender, index: number) => {
         sections.push({
            title: index === 0 ? LOANS_I18N_KEYS.DETAIL_SECTION_LENDER : undefined,
            amounts: false,
            rows: [
               { label: USERS_I18N_KEYS.DETAIL_NAME, value: investor.fullname },
               { label: USERS_I18N_KEYS.DETAIL_USERNAME, value: investor.username },
            ],
         });
      });

      return sections;
   });

   /**
    * Opens the payments over this dialog, so the user can come back to it
    */
   public handlePayments(): void {
      const loan: LoanDetail | undefined = this.$loan();

      if (!loan) return;

      this._payments.open({ id: loan.id, folio: compactFolio(loan.folio) });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.LOAN_PAYMENTS_TITLE,
         titleParams: { folio: compactFolio(loan.folio) },
         component: LoanPaymentsDialogComponent,
         size: 'lg',
      });
   }

   private money(value: number): string {
      return `${this.currency.transform(value)} MXN`;
   }

   private formatPhone(value: string | null): string | null {
      return value ? this.phone.transform(value, ' ') : null;
   }
}
