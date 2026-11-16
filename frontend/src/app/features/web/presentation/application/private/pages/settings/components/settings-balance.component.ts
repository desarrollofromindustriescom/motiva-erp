import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { CashBalance } from '../../../../../../../../interfaces/cash-balance';
import { SETTINGS_I18N_KEYS } from '../../../../../../../data/repository/settings.repository';

@Component({
   selector: 'fi-settings-balance-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, TooltipModule],
   template: `
      @let balance = $balance();

      <section
         class="bg-main flex w-full flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:p-6"
      >
         <div class="flex min-w-0 flex-col items-start justify-start">
            <h2 class="text-xl font-medium text-white sm:text-2xl">{{ I18N.BALANCE_TITLE | translate }}</h2>

            @if (balance) {
               <span class="text-3xl font-bold wrap-anywhere text-white sm:text-4xl">
                  {{ balance.amount | currency }}
               </span>
               <span class="text-xs text-white">
                  {{ I18N.BALANCE_UPDATED | translate: { date: (balance.last_update | date: 'dd.MM.yyyy') } }}
               </span>
            } @else {
               <div class="mt-2 h-9 w-40 animate-pulse rounded-md bg-white/40 sm:h-10"></div>
               <div class="mt-1 h-3 w-32 animate-pulse rounded-md bg-white/40"></div>
            }
         </div>

         <div class="flex items-center justify-end gap-2">
            @for (action of actions; track action.icon) {
               <button
                  class="flex cursor-pointer items-center justify-center rounded-xl bg-white p-2.5 transition-all hover:bg-slate-100 focus:bg-slate-100 disabled:cursor-auto disabled:opacity-60 disabled:hover:bg-white disabled:focus:bg-white"
                  type="button"
                  tooltipPosition="top"
                  [disabled]="!balance"
                  [pTooltip]="action.label | translate"
                  [showDelay]="1500"
                  (click)="action.handle()"
               >
                  <i [class]="'bx text-main text-2xl ' + action.icon"></i>
               </button>
            }
         </div>
      </section>
   `,
})
export class SettingsBalanceComponent {
   public readonly I18N = SETTINGS_I18N_KEYS;

   public $balance: InputSignal<CashBalance | undefined> = input<CashBalance | undefined>(undefined, {
      alias: 'balance',
   });

   public $movements: OutputEmitterRef<void> = output({ alias: 'movements' });
   public $withdraw: OutputEmitterRef<void> = output({ alias: 'withdraw' });
   public $deposit: OutputEmitterRef<void> = output({ alias: 'deposit' });

   public readonly actions: { icon: string; label: string; handle: () => void }[] = [
      { icon: 'bx-menu-left', label: this.I18N.BALANCE_MOVEMENTS, handle: () => this.$movements.emit() },
      { icon: 'bx-currency-notes', label: this.I18N.BALANCE_WITHDRAW, handle: () => this.$withdraw.emit() },
      { icon: 'bx-arrow-out-up-circle-half', label: this.I18N.BALANCE_DEPOSIT, handle: () => this.$deposit.emit() },
   ];
}
