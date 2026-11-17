import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, InputSignal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Investment } from '../../../../../../../interfaces/investment';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import {
   INVESTMENT_STATUS_COLORS,
   INVESTMENTS_I18N_KEYS,
   termLabel,
} from '../../../../../../data/repository/investments.repository';

/**
 * Data & balance of one investment: shown on its detail dialog and on every
 * investment of a cancellation request. The current amount already includes
 * the reward: what was recovered is the current amount without it & the amount
 * in the wallet is the whole current amount. The reward is also shown as a
 * percentage of the initial amount.
 */
@Component({
   selector: 'fi-investment-info-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe],
   template: `
      @let investment = $investment();

      <div class="flex w-full flex-col gap-6">
         <dl class="flex w-full flex-col text-sm">
            <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
               <dt class="text-second w-32 shrink-0 sm:w-44">{{ I18N.DETAIL_FOLIO | translate }}:</dt>
               <dd class="text-second/80 wrap-anywhere">{{ folio(investment) }}</dd>
            </div>
            <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
               <dt class="text-second w-32 shrink-0 sm:w-44">{{ I18N.DETAIL_OPENED | translate }}:</dt>
               <dd class="text-second/80">{{ investment.created_at | date: 'dd.MM.yyyy' }}</dd>
            </div>
            <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
               <dt class="text-second w-32 shrink-0 sm:w-44">{{ I18N.DETAIL_TERM | translate }}:</dt>
               <dd class="text-second/80">{{ term(investment).key | translate: term(investment).params }}</dd>
            </div>
            <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
               <dt class="text-second w-32 shrink-0 sm:w-44">{{ I18N.DETAIL_CLOSED | translate }}:</dt>
               <dd class="text-second/80">{{ investment.closed_at | date: 'dd.MM.yyyy' }}</dd>
            </div>
            <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
               <dt class="text-second w-32 shrink-0 sm:w-44">{{ I18N.DETAIL_UPDATED | translate }}:</dt>
               <dd class="text-second/80">{{ investment.last_update | date: 'dd.MM.yyyy' }}</dd>
            </div>
            <div class="flex items-center gap-4 border-b border-slate-300 px-1 py-2">
               <dt class="text-second w-32 shrink-0 sm:w-44">{{ I18N.DETAIL_STATUS | translate }}:</dt>
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
                  <dd class="text-second/80">{{ recovered(investment) | currency }} MXN</dd>
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
      </div>
   `,
})
export class InvestmentInfoComponent {
   public readonly I18N = INVESTMENTS_I18N_KEYS;
   public readonly STATUS_COLORS: Record<string, string> = INVESTMENT_STATUS_COLORS;

   public $investment: InputSignal<Investment> = input.required<Investment>({ alias: 'investment' });

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

   // what was recovered: the current amount without the reward
   public recovered(investment: Investment): number {
      return Math.round((investment.current_amount - investment.current_reward) * 100) / 100;
   }

   // what the investment holds: the recovered amount plus the reward
   public wallet(investment: Investment): number {
      return Math.round(investment.current_amount * 100) / 100;
   }
}
