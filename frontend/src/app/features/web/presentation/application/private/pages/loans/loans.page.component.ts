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
import { LoanPaymentsService } from '../../../../../../data/services/loan-payments.service';
import { LoanDetailService } from '../../../../../../data/services/loan-detail.service';
import { LoanBorrowersService } from '../../../../../../data/services/loan-borrowers.service';
import { LoanCreationService } from '../../../../../../data/services/loan-creation.service';
import { LoansListService } from '../../../../../../data/services/loans-list.service';
import { SidebarService } from '../../../../../../data/services/sidebar.service';
import { LoanPaymentsDialogComponent } from '../../../../common/dialogs/views/loans/loan-payments.dialog.component';
import { LoanDetailDialogComponent } from '../../../../common/dialogs/views/loans/loan-detail.dialog.component';
import { LoanPaymentPayDialogComponent } from '../../../../common/dialogs/views/loans/loan-payment-pay.dialog.component';
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
   private readonly _pay: LoanPaymentPayService = inject(LoanPaymentPayService);

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
    * Only the new loan has an action for now, the other buttons do nothing yet
    */
   public handleAction({ option }: { option: string }): void {
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

   public handlePayments({ loan }: { loan: LoanRow }): void {
      this._payments.open({ id: loan.id, folio: compactFolio(loan.folio) });
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
