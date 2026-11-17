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
import { LoanDetailService } from '../../../../../../data/services/loan-detail.service';
import { LoanBorrowersService } from '../../../../../../data/services/loan-borrowers.service';
import { LoanCreationService } from '../../../../../../data/services/loan-creation.service';
import { LoansListService } from '../../../../../../data/services/loans-list.service';
import { SidebarService } from '../../../../../../data/services/sidebar.service';
import { LoanDetailDialogComponent } from '../../../../common/dialogs/views/loans/loan-detail.dialog.component';
import { LoanCreateDialogComponent } from '../../../../common/dialogs/views/loans/loan-create.dialog.component';
import { LoansTableComponent } from './components/loans-table.component';

@Component({
   selector: 'fi-loans-page-component',
   imports: [LoansTableComponent],
   host: { class: 'flex flex-col' },
   template: `<fi-loans-table-component
      class="flex flex-auto flex-col"
      (details)="handleDetails({ loan: $event })"
   />`,
})
export class LoansPageComponent {
   private readonly _sidebar: SidebarService = inject(SidebarService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _creation: LoanCreationService = inject(LoanCreationService);
   private readonly _list: LoansListService = inject(LoansListService);
   private readonly _borrowers: LoanBorrowersService = inject(LoanBorrowersService);
   private readonly _detail: LoanDetailService = inject(LoanDetailService);

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
}
