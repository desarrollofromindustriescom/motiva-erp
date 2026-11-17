import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { InvestorBalance } from '../../../../../../../interfaces/cash-balance';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { InvestorMovementDialogComponent } from './investor-movement.dialog.component';
import { InvestorInvestmentDialogComponent } from './investor-investment.dialog.component';
import { InvestmentCancellationDialogComponent } from './investment-cancellation.dialog.component';
import { InvestmentsTableComponent } from './investments-table.component';
import { CashMovementsDialogComponent } from '../cash-balance/cash-movements.dialog.component';
import { CashMovementsService } from '../../../../../../data/services/cash-movements.service';
import { InvestmentCancellationService } from '../../../../../../data/services/investment-cancellation.service';
import { InvestmentsService } from '../../../../../../data/services/investments.service';
import { InvestorBalanceService } from '../../../../../../data/services/investor-balance.service';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { SETTINGS_I18N_KEYS } from '../../../../../../data/repository/settings.repository';
import { USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';

interface BalanceAction {
   id: 'cancellation' | 'investment' | 'movements' | 'withdraw' | 'deposit';
   icon: string;
   label: string;
}

/**
 * Investments of an investor. For now it only shows the header: the data
 * of the investor, its cash balance & the main actions (without behavior yet)
 */
@Component({
   selector: 'fi-investor-balance-dialog-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, TooltipModule, InvestmentsTableComponent],
   template: `
      @let balance = $balance();

      <div class="flex w-full flex-col gap-6">
         @if (balance) {
            <section class="bg-main flex w-full flex-col gap-6 rounded-2xl p-5 sm:p-6">
               <div class="flex min-w-0 flex-col">
                  <h2 class="text-xl font-bold wrap-anywhere text-white sm:text-2xl">{{ balance.fullname }}</h2>
                  <span class="text-xs text-white">
                     {{ I18N.BALANCE_SINCE | translate: { date: (balance.since | date: 'dd.MM.yyyy') } }}
                  </span>
               </div>

               <div class="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div class="flex min-w-0 flex-col">
                     <span class="text-3xl font-bold wrap-anywhere text-white sm:text-4xl">
                        {{ balance.amount | currency }}
                     </span>
                     <span class="text-xs text-white">
                        {{ SETTINGS.BALANCE_UPDATED | translate: { date: (balance.last_update | date: 'dd.MM.yyyy') } }}
                     </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                     @for (action of actions; track action.id) {
                        <button
                           class="flex cursor-pointer items-center justify-center rounded-xl bg-white p-2.5 transition-all hover:bg-slate-100 focus:bg-slate-100 disabled:cursor-auto disabled:opacity-50 disabled:hover:bg-white disabled:focus:bg-white"
                           type="button"
                           tooltipPosition="top"
                           [pTooltip]="action.label | translate"
                           [showDelay]="1500"
                           [disabled]="!enabled({ action, balance })"
                           (click)="handleAction({ action })"
                        >
                           <i [class]="'bx text-main text-2xl ' + action.icon"></i>
                        </button>
                     }
                  </div>
               </div>
            </section>
         } @else {
            <div class="flex h-48 w-full animate-pulse flex-col justify-between rounded-2xl bg-slate-300 p-6">
               <div class="h-7 w-56 rounded-md bg-slate-400/60"></div>
               <div class="h-10 w-40 rounded-md bg-slate-400/60"></div>
            </div>
         }

         <fi-investments-table-component />
      </div>
   `,
})
export class InvestorBalanceDialogComponent {
   private readonly _balance: InvestorBalanceService = inject(InvestorBalanceService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _movements: CashMovementsService = inject(CashMovementsService);
   private readonly _investments: InvestmentsService = inject(InvestmentsService);
   private readonly _cancellation: InvestmentCancellationService = inject(InvestmentCancellationService);

   public readonly I18N = USERS_I18N_KEYS;
   public readonly SETTINGS = SETTINGS_I18N_KEYS;

   public readonly actions: BalanceAction[] = [
      { id: 'cancellation', icon: 'bx-file-zip', label: USERS_I18N_KEYS.BALANCE_CANCELLATION },
      { id: 'investment', icon: 'bx-dollar-circle', label: USERS_I18N_KEYS.BALANCE_NEW_INVESTMENT },
      { id: 'movements', icon: 'bx-menu-left', label: USERS_I18N_KEYS.BALANCE_MOVEMENTS },
      { id: 'withdraw', icon: 'bx-currency-notes', label: USERS_I18N_KEYS.BALANCE_WITHDRAW },
      { id: 'deposit', icon: 'bx-arrow-out-up-circle-half', label: USERS_I18N_KEYS.BALANCE_DEPOSIT },
   ];

   public readonly $balance: Signal<InvestorBalance | undefined> = computed(() => this._balance.balance);
   public readonly $loading: Signal<boolean> = computed(() => this._balance.loading);
   public readonly $failed: Signal<boolean> = computed(() => this._balance.failed);

   constructor() {
      // the investments are asked again every time this dialog is shown (ex: when coming back)
      const id: string | null = this._balance.id;

      if (id) this._investments.open({ investorId: id });

      effect(() => {
         const loading: boolean = this.$loading();
         untracked(() => (this._dialogs.loading = loading));
      });

      // the error interceptor already notified the user
      effect(() => {
         if (this.$failed()) untracked(() => this._dialogs.closeDialogs());
      });
   }

   /**
    * A cancellation request needs at least 1 active investment & no other request
    * pending (a request answered, approved or rejected, doesn't block a new one)
    */
   public enabled({ action, balance }: { action: BalanceAction; balance: InvestorBalance }): boolean {
      if (action.id !== 'cancellation') return true;

      return balance.active_investments > 0 && !balance.pending_cancellation;
   }

   public handleAction({ action }: { action: BalanceAction }): void {
      switch (action.id) {
         case 'cancellation':
            this.handleCancellation();
            break;
         case 'investment':
            this.handleInvestment();
            break;
         case 'movements':
            this.handleMovements();
            break;
         case 'deposit':
         case 'withdraw':
            this.handleMovement({ movement: action.id });
            break;
      }
   }

   private handleCancellation(): void {
      this._cancellation.start();
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.CANCELLATION_TITLE,
         component: InvestmentCancellationDialogComponent,
         size: 'lg',
      });
   }

   private handleInvestment(): void {
      this._investments.startCreation();
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.NEW_INVESTMENT_TITLE,
         component: InvestorInvestmentDialogComponent,
         size: 'lg',
      });
   }

   /**
    * Movements of the balance of this investor, with the same dialogs
    * (list & detail) as the movements of the general cash balance
    */
   private handleMovements(): void {
      const id: string | null = this._balance.id;

      if (!id) return;

      this._movements.open({ investorId: id });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.INVESTOR_MOVEMENTS_TITLE,
         component: CashMovementsDialogComponent,
         size: 'lg',
      });
   }

   private handleMovement({ movement }: { movement: 'deposit' | 'withdraw' }): void {
      this._balance.startMovement({ movement });
      this._dialogs.newDialog({
         title:
            movement === 'deposit' ? DIALOG_I18N_KEYS.INVESTOR_DEPOSIT_TITLE : DIALOG_I18N_KEYS.INVESTOR_WITHDRAW_TITLE,
         component: InvestorMovementDialogComponent,
         size: 'lg',
      });
   }
}
