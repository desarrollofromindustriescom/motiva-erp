import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Investment } from '../../../../../../../interfaces/investment';
import { CashMovementsService } from '../../../../../../data/services/cash-movements.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { InvestmentsService } from '../../../../../../data/services/investments.service';
import { InvestorBalanceService } from '../../../../../../data/services/investor-balance.service';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { INVESTMENTS_I18N_KEYS } from '../../../../../../data/repository/investments.repository';
import { CashMovementsDialogComponent } from '../cash-balance/cash-movements.dialog.component';
import { InvestmentInfoComponent } from './investment-info.component';

/**
 * Detail of one investment: its data & its balance. The amount in the wallet is
 * what was recovered plus the reward, and the reward is also shown as a
 * percentage of the initial amount.
 */
@Component({
   selector: 'fi-investment-detail-dialog-component',
   imports: [TranslatePipe, InvestmentInfoComponent],
   template: `
      @let investment = $investment();

      @if (investment) {
         <div class="flex w-full flex-col gap-6">
            <fi-investment-info-component [investment]="investment" />

            <div class="flex w-full justify-end">
               <button
                  class="bg-second hover:bg-second-light focus:bg-second-light flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-white transition-all sm:w-auto"
                  type="button"
                  (click)="handleMovements({ investment })"
               >
                  <i class="bx bx-menu-left text-xl"></i>
                  {{ I18N.BUTTON_MOVEMENTS | translate }}
               </button>
            </div>
         </div>
      }
   `,
})
export class InvestmentDetailDialogComponent {
   private readonly _investments: InvestmentsService = inject(InvestmentsService);
   private readonly _balance: InvestorBalanceService = inject(InvestorBalanceService);
   private readonly _movements: CashMovementsService = inject(CashMovementsService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = INVESTMENTS_I18N_KEYS;

   public readonly $investment: Signal<Investment | null> = computed(() => this._investments.selected);

   /**
    * Movements related to this investment, with the same dialogs
    * (list & detail) as the other movements
    */
   public handleMovements({ investment }: { investment: Investment }): void {
      const investorId: string | null = this._balance.id;

      if (!investorId) return;

      this._movements.open({ investorId, investmentId: investment.id });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.INVESTMENT_MOVEMENTS_TITLE,
         titleParams: { folio: compactFolio(investment.folio) },
         component: CashMovementsDialogComponent,
         size: 'lg',
      });
   }
}
