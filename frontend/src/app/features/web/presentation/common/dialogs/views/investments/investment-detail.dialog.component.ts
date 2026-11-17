import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Investment } from '../../../../../../../interfaces/investment';
import { CashMovementsService } from '../../../../../../data/services/cash-movements.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { InvestmentsService } from '../../../../../../data/services/investments.service';
import { InvestorBalanceService } from '../../../../../../data/services/investor-balance.service';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import {
   INVESTMENT_STATUS_COLORS,
   INVESTMENTS_I18N_KEYS,
   termLabel,
} from '../../../../../../data/repository/investments.repository';
import { CashMovementsDialogComponent } from '../cash-balance/cash-movements.dialog.component';

/**
 * Detail of one investment: its data & its balance. The amount in the wallet is
 * what was recovered plus the reward, and the reward is also shown as a
 * percentage of the initial amount.
 */
@Component({
   selector: 'fi-investment-detail-dialog-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe],
   template: `
      @let investment = $investment();

      @if (investment) {
         <div class="flex w-full flex-col gap-6">
            <dl class="flex w-full flex-col text-sm">
               <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
                  <dt class="text-second w-44 shrink-0">{{ I18N.DETAIL_FOLIO | translate }}:</dt>
                  <dd class="text-second/80 wrap-anywhere">{{ folio(investment) }}</dd>
               </div>
               <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
                  <dt class="text-second w-44 shrink-0">{{ I18N.DETAIL_OPENED | translate }}:</dt>
                  <dd class="text-second/80">{{ investment.created_at | date: 'dd.MM.yyyy' }}</dd>
               </div>
               <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
                  <dt class="text-second w-44 shrink-0">{{ I18N.DETAIL_TERM | translate }}:</dt>
                  <dd class="text-second/80">{{ term(investment).key | translate: term(investment).params }}</dd>
               </div>
               <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
                  <dt class="text-second w-44 shrink-0">{{ I18N.DETAIL_CLOSED | translate }}:</dt>
                  <dd class="text-second/80">{{ investment.closed_at | date: 'dd.MM.yyyy' }}</dd>
               </div>
               <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
                  <dt class="text-second w-44 shrink-0">{{ I18N.DETAIL_UPDATED | translate }}:</dt>
                  <dd class="text-second/80">{{ investment.last_update | date: 'dd.MM.yyyy' }}</dd>
               </div>
               <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
                  <dt class="text-second w-44 shrink-0">{{ I18N.DETAIL_STATUS | translate }}:</dt>
                  <dd>
                     <span
                        class="rounded px-2 py-0.5 text-sm whitespace-nowrap text-white lowercase"
                        [class]="STATUS_COLORS[investment.status.slug] || 'bg-slate-500'"
                        >{{ investment.status.title }}</span
                     >
                  </dd>
               </div>
            </dl>

            <section class="flex w-full flex-col gap-1">
               <h3 class="text-second text-sm font-medium">{{ I18N.DETAIL_SECTION_BALANCE | translate }}</h3>
               <dl class="flex w-full flex-col text-sm">
                  <div class="flex items-center justify-between gap-4 border-b border-slate-300 px-1 py-2">
                     <dt class="text-second">{{ I18N.DETAIL_INITIAL | translate }}:</dt>
                     <dd class="text-second/80">{{ investment.initial_amount | currency }} MXN</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4 border-b border-slate-300 px-1 py-2">
                     <dt class="text-second">{{ I18N.DETAIL_RECOVERED | translate }}:</dt>
                     <dd class="text-second/80">{{ investment.current_amount | currency }} MXN</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4 border-b border-slate-300 px-1 py-2">
                     <dt class="text-second">{{ I18N.DETAIL_REWARD | translate }}:</dt>
                     <dd class="text-second/80">
                        ({{ percentage(investment) }}%) {{ investment.current_reward | currency }} MXN
                     </dd>
                  </div>
                  <div class="flex items-center justify-between gap-4 border-b border-slate-300 px-1 py-2">
                     <dt class="text-second">{{ I18N.DETAIL_WALLET | translate }}:</dt>
                     <dd class="text-second/80">{{ wallet(investment) | currency }} MXN</dd>
                  </div>
               </dl>
            </section>

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
   public readonly STATUS_COLORS: Record<string, string> = INVESTMENT_STATUS_COLORS;

   public readonly $investment: Signal<Investment | null> = computed(() => this._investments.selected);

   public folio(investment: Investment): string {
      return compactFolio(investment.folio);
   }

   public term(investment: Investment) {
      return termLabel(investment.reward_cycle);
   }

   // reward as a percentage of the initial amount, rounded
   public percentage(investment: Investment): number {
      return investment.initial_amount > 0
         ? Math.round((investment.current_reward / investment.initial_amount) * 100)
         : 0;
   }

   // what was recovered plus the reward
   public wallet(investment: Investment): number {
      return Math.round((investment.current_amount + investment.current_reward) * 100) / 100;
   }

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
