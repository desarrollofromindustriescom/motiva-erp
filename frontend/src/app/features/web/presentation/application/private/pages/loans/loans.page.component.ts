import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { LoanRow } from '../../../../../../../interfaces/loan';
import { SidebarFiltersEvent, SidebarSelection } from '../../../../../../../interfaces/sidebar';
import { APPLICATION_MODULES } from '../../../../../../data/repository/navigation.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { SIDEBAR_OPTIONS, SIDEBAR_SECTIONS } from '../../../../../../data/repository/sidebar.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanPaymentPayService } from '../../../../../../data/services/loan-payment-pay.service';
import { AgreementCreationService } from '../../../../../../data/services/agreement-creation.service';
import { LoansCalendarService } from '../../../../../../data/services/loans-calendar.service';
import { LoanTicketService } from '../../../../../../data/services/loan-ticket.service';
import { LoanPaymentsService } from '../../../../../../data/services/loan-payments.service';
import { LoanDetailService } from '../../../../../../data/services/loan-detail.service';
import { LoanBorrowersService } from '../../../../../../data/services/loan-borrowers.service';
import { LoanCreationService } from '../../../../../../data/services/loan-creation.service';
import { LoansListService } from '../../../../../../data/services/loans-list.service';
import { SidebarService } from '../../../../../../data/services/sidebar.service';
import { LoanTicketDialogComponent } from '../../../../common/dialogs/views/loans/loan-ticket.dialog.component';
import { LoanPaymentsDialogComponent } from '../../../../common/dialogs/views/loans/loan-payments.dialog.component';
import { LoanDetailDialogComponent } from '../../../../common/dialogs/views/loans/loan-detail.dialog.component';
import { LoanPaymentPayDialogComponent } from '../../../../common/dialogs/views/loans/loan-payment-pay.dialog.component';
import { AgreementCreateDialogComponent } from '../../../../common/dialogs/views/loans/agreement-create.dialog.component';
import { LoansCalendarDialogComponent } from '../../../../common/dialogs/views/loans/loans-calendar.dialog.component';
import { LoanCreateDialogComponent } from '../../../../common/dialogs/views/loans/loan-create.dialog.component';
import { LoansTableComponent } from './components/loans-table.component';

@Component({
   selector: 'fi-loans-page-component',
   imports: [LoansTableComponent],
   host: { class: 'flex flex-col' },
   template: `<fi-loans-table-component
      class="flex flex-auto flex-col"
      (details)="handleDetails({ loan: $event })"
      (edit)="handleEdit({ loan: $event })"
      (ticket)="handleTicket({ loan: $event })"
      (payments)="handlePayments({ loan: $event })"
      (pay)="handlePay({ loan: $event })"
   />`,
})
export class LoansPageComponent {
   private readonly _sidebar: SidebarService = inject(SidebarService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _creation: LoanCreationService = inject(LoanCreationService);
   private readonly _list: LoansListService = inject(LoansListService);
   private readonly _borrowers: LoanBorrowersService = inject(LoanBorrowersService);
   private readonly _detail: LoanDetailService = inject(LoanDetailService);
   private readonly _payments: LoanPaymentsService = inject(LoanPaymentsService);
   private readonly _calendar: LoansCalendarService = inject(LoansCalendarService);
   private readonly _agreement: AgreementCreationService = inject(AgreementCreationService);
   private readonly _pay: LoanPaymentPayService = inject(LoanPaymentPayService);
   private readonly _ticket: LoanTicketService = inject(LoanTicketService);

   constructor() {
      // filters are never active when entering the page
      this._sidebar.resetFilters();
      this._list.enter();
      this._borrowers.load({ search: '' });

      this._sidebar.filters$
         .pipe(
            filter(
               ({ module, section }: SidebarFiltersEvent) =>
                  module === APPLICATION_MODULES.LOANS && section === SIDEBAR_SECTIONS.LOANS_FILTERS,
            ),
            takeUntilDestroyed(),
         )
         .subscribe(({ values }: SidebarFiltersEvent) => this._list.applyFilters({ values }));

      this._sidebar.selection$
         .pipe(
            filter(
               ({ module, section }: SidebarSelection) =>
                  module === APPLICATION_MODULES.LOANS && section === SIDEBAR_SECTIONS.LOANS_ACTIONS,
            ),
            takeUntilDestroyed(),
         )
         .subscribe(({ option }: SidebarSelection) => this.handleAction({ option }));
   }

   /**
    * The new loan, the new agreement, the calendar of payments & the Excel of the table have an action
    */
   public handleAction({ option }: { option: string }): void {
      if (option === SIDEBAR_OPTIONS.LOANS_NEW_AGREEMENT) {
         this._agreement.start();
         this._dialogs.newDialog({
            title: DIALOG_I18N_KEYS.NEW_AGREEMENT_TITLE,
            component: AgreementCreateDialogComponent,
            size: 'lg',
         });

         return;
      }

      if (option === SIDEBAR_OPTIONS.LOANS_EXCEL) {
         this._list.downloadExcel();

         return;
      }

      if (option === SIDEBAR_OPTIONS.LOANS_CALENDAR) {
         this._calendar.open();
         this._dialogs.newDialog({
            title: DIALOG_I18N_KEYS.LOANS_CALENDAR_TITLE,
            component: LoansCalendarDialogComponent,
            size: 'lg',
         });

         return;
      }

      if (option !== SIDEBAR_OPTIONS.LOANS_NEW_LOAN) return;

      this._creation.start();
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.NEW_LOAN_TITLE,
         component: LoanCreateDialogComponent,
         size: 'lg',
      });
   }

   public handleDetails({ loan }: { loan: LoanRow }): void {
      this._detail.open({ id: loan.id });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.LOAN_DETAIL_TITLE,
         titleParams: { folio: compactFolio(loan.folio) },
         component: LoanDetailDialogComponent,
         size: 'sm',
      });
   }

   /**
    * Continues a pending loan in the same dialog of a new one, with its data
    */
   public handleEdit({ loan }: { loan: LoanRow }): void {
      this._creation.startEdit({ id: loan.id }).then((done: boolean) => {
         if (!done) return;

         this._dialogs.newDialog({
            title: DIALOG_I18N_KEYS.EDIT_LOAN_TITLE,
            titleParams: { folio: compactFolio(loan.folio) },
            component: LoanCreateDialogComponent,
            size: 'lg',
         });
      });
   }

   /**
    * Registers how the loan was handed to the borrower (cash or transfer with its receipt)
    */
   public handleTicket({ loan }: { loan: LoanRow }): void {
      this._ticket.start({ loanId: loan.id });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.LOAN_TICKET_TITLE,
         titleParams: { folio: compactFolio(loan.folio) },
         component: LoanTicketDialogComponent,
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

   /**
    * Pays any part of what the loan owes
    */
   public handlePay({ loan }: { loan: LoanRow }): void {
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
}
