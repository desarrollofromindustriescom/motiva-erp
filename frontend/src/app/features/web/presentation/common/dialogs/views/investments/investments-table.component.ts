import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { Investment } from '../../../../../../../interfaces/investment';
import { CashMovementsService } from '../../../../../../data/services/cash-movements.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { InvestorBalanceService } from '../../../../../../data/services/investor-balance.service';
import { InvestmentsService } from '../../../../../../data/services/investments.service';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import {
   INVESTMENT_STATUS_COLORS,
   INVESTMENTS_I18N_KEYS,
   termLabel,
} from '../../../../../../data/repository/investments.repository';
import { CashMovementsDialogComponent } from '../cash-balance/cash-movements.dialog.component';
import { InvestmentDetailDialogComponent } from './investment-detail.dialog.component';

/**
 * Investments of the investor (every status, the active ones first) with
 * the buttons to see the detail & the movements of each one
 */
interface InvestmentAction {
   id: 'details' | 'movements';
   tooltip: string;
}

@Component({
   selector: 'fi-investments-table-component',
   imports: [NgTemplateOutlet, CurrencyPipe, DatePipe, TranslatePipe, TableModule, PaginatorModule],
   template: `
      @let investments = $investments();
      @let loading = $loading();

      <ng-template
         #rowActions
         let-investment
      >
         <div class="flex w-full flex-wrap items-center justify-end gap-1 max-sm:justify-start">
            @for (action of actions; track action.id) {
               <button
                  class="bg-second hover:bg-second-light focus:bg-second-light flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1 text-sm whitespace-nowrap text-white transition-all"
                  type="button"
                  (click)="handleAction({ action, investment })"
               >
                  {{ action.tooltip | translate }}
               </button>
            }
         </div>
      </ng-template>

      <section class="flex w-full flex-col gap-2">
         <h2 class="text-second text-xl font-medium sm:text-2xl">{{ I18N.TITLE | translate }}</h2>

         <p-table
            class="block w-full max-sm:[&_td]:px-1.5! max-sm:[&_th]:px-1.5!"
            [value]="investments"
            [loading]="loading"
         >
            <ng-template #header>
               <tr>
                  <th>{{ I18N.HEAD_FOLIO | translate }}</th>
                  <th class="text-right!">{{ I18N.HEAD_INITIAL | translate }}</th>
                  <th class="text-right! max-sm:hidden">{{ I18N.HEAD_CURRENT | translate }}</th>
                  <th class="max-md:hidden">{{ I18N.HEAD_OPENED | translate }}</th>
                  <th class="max-sm:hidden">{{ I18N.HEAD_TERM | translate }}</th>
                  <th>{{ I18N.HEAD_STATUS | translate }}</th>
                  <th class="max-sm:hidden"></th>
               </tr>
            </ng-template>
            <ng-template
               #body
               let-investment
            >
               <tr class="max-sm:[&>td]:border-b-0!">
                  <td class="whitespace-nowrap">{{ folio(investment) }}</td>
                  <td class="text-right! whitespace-nowrap text-green-600">
                     {{ investment.initial_amount | currency }}
                  </td>
                  <td class="text-right! whitespace-nowrap text-green-600 max-sm:hidden">
                     {{ investment.current_amount | currency }}
                  </td>
                  <td class="whitespace-nowrap max-md:hidden">{{ investment.created_at | date: 'dd.MM.yyyy' }}</td>
                  <td class="whitespace-nowrap max-sm:hidden">
                     {{ term(investment).key | translate: term(investment).params }}
                  </td>
                  <td>
                     <span
                        class="rounded px-2 py-0.5 text-sm whitespace-nowrap text-white lowercase"
                        [class]="STATUS_COLORS[investment.status.slug] || 'bg-slate-500'"
                        >{{ investment.status.title }}</span
                     >
                  </td>
                  <td class="max-sm:hidden">
                     <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: investment }" />
                  </td>
               </tr>
               <tr class="sm:hidden">
                  <td
                     colspan="7"
                     class="pt-0!"
                  >
                     <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: investment }" />
                  </td>
               </tr>
            </ng-template>
            <ng-template #emptymessage>
               <tr>
                  <td
                     class="py-6 text-center"
                     colspan="7"
                  >
                     {{ loading ? '' : (I18N.EMPTY | translate) }}
                  </td>
               </tr>
            </ng-template>
         </p-table>

         @if ($total() > $size) {
            <p-paginator
               class="w-full"
               [first]="($page() - 1) * $size"
               [rows]="$size"
               [totalRecords]="$total()"
               [showFirstLastIcon]="true"
               [pageLinkSize]="3"
               (onPageChange)="handlePage($event)"
            />
         }
      </section>
   `,
})
export class InvestmentsTableComponent {
   private readonly _investments: InvestmentsService = inject(InvestmentsService);
   private readonly _balance: InvestorBalanceService = inject(InvestorBalanceService);
   private readonly _movements: CashMovementsService = inject(CashMovementsService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = INVESTMENTS_I18N_KEYS;
   public readonly STATUS_COLORS: Record<string, string> = INVESTMENT_STATUS_COLORS;
   public readonly actions: InvestmentAction[] = [
      { id: 'details', tooltip: INVESTMENTS_I18N_KEYS.TOOLTIP_DETAILS },
      { id: 'movements', tooltip: INVESTMENTS_I18N_KEYS.TOOLTIP_MOVEMENTS },
   ];
   public readonly $size: number = this._investments.size;

   public readonly $investments: Signal<Investment[]> = computed(() => this._investments.investments);
   public readonly $total: Signal<number> = computed(() => this._investments.total);
   public readonly $page: Signal<number> = computed(() => this._investments.page);
   public readonly $loading: Signal<boolean> = computed(() => this._investments.loading);

   public folio(investment: Investment): string {
      return compactFolio(investment.folio);
   }

   public term(investment: Investment) {
      return termLabel(investment.reward_cycle);
   }

   public handlePage(event: PaginatorState): void {
      this._investments.changePage({ page: (event.page ?? 0) + 1 });
   }

   public handleAction({ action, investment }: { action: InvestmentAction; investment: Investment }): void {
      const folio: string = compactFolio(investment.folio);

      if (action.id === 'details') {
         this._investments.selected = investment;
         this._dialogs.newDialog({
            title: DIALOG_I18N_KEYS.INVESTMENT_DETAIL_TITLE,
            titleParams: { folio },
            component: InvestmentDetailDialogComponent,
            size: 'sm',
         });

         return;
      }

      const investorId: string | null = this._balance.id;

      if (!investorId) return;

      this._movements.open({ investorId, investmentId: investment.id });
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.INVESTMENT_MOVEMENTS_TITLE,
         titleParams: { folio },
         component: CashMovementsDialogComponent,
         size: 'lg',
      });
   }
}
