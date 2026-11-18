import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, Signal } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { AgreementLoanRef, LoanDetail, LoanLender } from '../../../../../../../interfaces/loan';
import { LOAN_DETAIL_TYPES, LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanPaymentPayService } from '../../../../../../data/services/loan-payment-pay.service';
import { LoanPaymentsService } from '../../../../../../data/services/loan-payments.service';
import { SessionService } from '../../../../../../data/services/session.service';
import { LoanTicketService } from '../../../../../../data/services/loan-ticket.service';
import { LoanDetailService } from '../../../../../../data/services/loan-detail.service';
import { LoanPaymentPayDialogComponent } from './loan-payment-pay.dialog.component';
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
   // the image of the receipt of the transfer goes under the rows
   ticket?: boolean;
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

                  @if (section.ticket && $ticket(); as ticket) {
                     <a
                        class="mt-2 block w-full overflow-hidden rounded-lg border border-slate-300"
                        target="_blank"
                        rel="noopener"
                        [href]="ticket"
                     >
                        <img
                           class="max-h-80 w-full object-contain"
                           [src]="ticket"
                           [alt]="I18N.DETAIL_TICKET_ALT | translate"
                        />
                     </a>
                  }
               </section>
            }

            <div
               class="grid w-full grid-cols-1 gap-2"
               [class.sm:grid-cols-2]="!$readOnly"
            >
               @if (!$readOnly) {
                  <button
                     class="bg-second hover:bg-second-light focus:bg-second-light flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white transition-all disabled:cursor-auto disabled:bg-slate-300"
                     type="button"
                     [disabled]="!$canPay()"
                     (click)="handlePay()"
                  >
                     <i class="bx bx-dollar text-xl"></i>
                     {{ I18N.BUTTON_PAY | translate }}
                  </button>
               }
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
   private readonly _pay: LoanPaymentPayService = inject(LoanPaymentPayService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _ticket: LoanTicketService = inject(LoanTicketService);

   private readonly currency: CurrencyPipe = new CurrencyPipe('en-US');
   private readonly date: DatePipe = new DatePipe('en-US');
   private readonly number: DecimalPipe = new DecimalPipe('en-US');
   private readonly phone: PhoneFormatPipe = new PhoneFormatPipe();

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly skeletons: number[] = [1, 2, 3, 4, 5, 6, 7, 8];

   public readonly $loan: Signal<LoanDetail | undefined> = computed(() => this._detail.detail);
   public readonly $ticket: Signal<SafeUrl | null> = computed(() => this._ticket.image);

   constructor() {
      // the image of the receipt is only requested when the loan has one (the borrower doesn't see it)
      effect(() => {
         const loan: LoanDetail | undefined = this.$loan();

         if (loan?.kind === 'loan' && loan.has_ticket && !this.$readOnly) {
            this._ticket.loadImage({ loanId: loan.id });
         }
      });

      inject(DestroyRef).onDestroy(() => this._ticket.clearImage());
   }

   // a borrower can only read its loans, it doesn't register payments
   public readonly $readOnly: boolean = this._session.session?.profile === 'borrower';

   // only a loan that is being paid (on time or late) can receive payments
   public readonly $canPay: Signal<boolean> = computed(() =>
      ['active', 'expired'].includes(this.$loan()?.status.slug ?? ''),
   );

   public readonly $sections: Signal<DetailSection[]> = computed(() => {
      const loan: LoanDetail | undefined = this.$loan();

      if (!loan) return [];

      const sections: DetailSection[] = [
         {
            amounts: false,
            rows: [
               { label: LOANS_I18N_KEYS.DETAIL_FOLIO, value: loan.folio },
               {
                  label:
                     loan.kind === 'agreement' ? LOANS_I18N_KEYS.DETAIL_AGREEMENT_RATE : LOANS_I18N_KEYS.DETAIL_RATE,
                  value: `${this.number.transform(loan.rate, '1.0-3')}%`,
               },
               {
                  label: LOANS_I18N_KEYS.DETAIL_TYPE,
                  value: LOAN_DETAIL_TYPES[loan.type],
                  translate: true,
               },
               { label: LOANS_I18N_KEYS.DETAIL_PAYMENTS, value: `${loan.no_payments}` },
               // a cancelled loan says which agreement it went to
               ...(loan.agreement
                  ? [{ label: LOANS_I18N_KEYS.DETAIL_AGREEMENT, value: compactFolio(loan.agreement.folio) }]
                  : []),
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
               {
                  label:
                     loan.kind === 'agreement' ? LOANS_I18N_KEYS.DETAIL_AGREEMENT_DEBT : LOANS_I18N_KEYS.DETAIL_LENT,
                  value: this.money(loan.amount),
               },
               { label: LOANS_I18N_KEYS.DETAIL_DEBT, value: this.money(loan.total) },
               { label: LOANS_I18N_KEYS.DETAIL_PAID_CAPITAL, value: this.money(loan.paid_capital) },
               { label: LOANS_I18N_KEYS.DETAIL_PAID_INTEREST, value: this.money(loan.paid_interest) },
               ...this.extrasRow(loan.paid_extras),
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
               ...this.extrasRow(loan.general.extras),
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

      // how the loan was handed to the borrower, with the image of the receipt of a transfer
      if (loan.payment) {
         sections.push({
            title: LOANS_I18N_KEYS.DETAIL_SECTION_PAYMENT,
            amounts: false,
            ticket: loan.payment === 'transfer',
            rows: [
               {
                  label: LOANS_I18N_KEYS.DETAIL_PAYMENT_METHOD,
                  value: loan.payment === 'transfer' ? LOANS_I18N_KEYS.TICKET_TRANSFER : LOANS_I18N_KEYS.TICKET_CASH,
                  translate: true,
               },
            ],
         });
      }

      // the loans an agreement was made of (they were cancelled) with what each one owed
      if (loan.agreement_loans.length > 0) {
         sections.push({
            title: LOANS_I18N_KEYS.DETAIL_SECTION_AGREEMENT_LOANS,
            amounts: true,
            rows: loan.agreement_loans.map((item: AgreementLoanRef) => ({
               label: compactFolio(item.folio),
               value: this.money(item.debt),
            })),
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
    * Pays any part of what the loan owes, over this dialog so the user can come back to it
    */
   public handlePay(): void {
      const loan: LoanDetail | undefined = this.$loan();

      if (!loan || !this.$canPay()) return;

      this._pay.startLoan({ loanId: loan.id }).then((done: boolean) => {
         if (!done) return;

         this._dialogs.newDialog({
            title: DIALOG_I18N_KEYS.LOAN_PAY_TITLE,
            titleParams: { folio: compactFolio(loan.folio) },
            component: LoanPaymentPayDialogComponent,
            size: 'sm',
         });
      });
   }

   /**
    * Opens the payments over this dialog, so the user can come back to it
    */
   public handlePayments(): void {
      const loan: LoanDetail | undefined = this.$loan();

      if (!loan) return;

      this._payments.open({ id: loan.id, folio: compactFolio(loan.folio), kind: loan.kind });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.LOAN_PAYMENTS_TITLE,
         titleParams: { folio: compactFolio(loan.folio) },
         component: LoanPaymentsDialogComponent,
         size: 'lg',
      });
   }

   // the extras (mora & visits) only show up when the payments have them
   private extrasRow(extras: number): DetailRow[] {
      return extras > 0 ? [{ label: LOANS_I18N_KEYS.DETAIL_EXTRAS, value: this.money(extras) }] : [];
   }

   private money(value: number): string {
      return `${this.currency.transform(value)} MXN`;
   }

   private formatPhone(value: string | null): string | null {
      return value ? this.phone.transform(value, ' ') : null;
   }
}
