import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, output, OutputEmitterRef, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { LoanRow, LoansOrder } from '../../../../../../../../interfaces/loan';
import { compactFolio } from '../../../../../../../data/repository/cash-balance.repository';
import { LOAN_STATUS_COLORS, LOANS_I18N_KEYS } from '../../../../../../../data/repository/loans.repository';
import { BorrowerLoansService } from '../../../../../../../data/services/borrower-loans.service';

interface RowAction {
   id: 'details' | 'payments';
   icon: string;
   tooltip: string;
}

/**
 * Loans of the borrower: the same columns of the loans table without the borrower, & only the
 * detail of the loan and its payments as actions
 */
@Component({
   selector: 'fi-borrower-loans-table-component',
   imports: [CurrencyPipe, DecimalPipe, TranslatePipe, TableModule, PaginatorModule, TooltipModule],
   template: `
      @let loans = $loans();
      @let loading = $loading();
      @let order = $order();

      <section class="flex w-full flex-auto flex-col gap-2 rounded-2xl border border-slate-500 p-3 sm:p-4">
         <div class="w-full flex-auto overflow-x-auto">
            <p-table
               class="block w-full max-sm:[&_td]:px-2! max-sm:[&_th]:px-2!"
               [value]="loans"
               [loading]="loading"
            >
               <ng-template #header>
                  <tr>
                     <th>
                        <button
                           class="flex cursor-pointer items-center gap-1 font-[inherit]"
                           type="button"
                           (click)="handleOrder()"
                        >
                           {{ I18N.HEAD_FOLIO | translate }}
                           <i
                              class="bx text-lg"
                              [class.text-main]="order !== ''"
                              [class.bx-arrow-up-down]="order === ''"
                              [class.bx-arrow-up-narrow-wide]="order === 'asc'"
                              [class.bx-arrow-down-wide-narrow]="order === 'desc'"
                           ></i>
                        </button>
                     </th>
                     <th class="max-md:hidden">{{ I18N.HEAD_STATUS | translate }}</th>
                     <th class="text-right!">{{ I18N.HEAD_AMOUNT | translate }}</th>
                     <th class="text-right! max-lg:hidden">{{ I18N.HEAD_TOTAL | translate }}</th>
                     <th class="text-right! max-xl:hidden">{{ I18N.HEAD_RATE | translate }}</th>
                     <th class="text-right! max-xl:hidden">{{ I18N.HEAD_PAYMENTS | translate }}</th>
                     <th></th>
                  </tr>
               </ng-template>
               <ng-template
                  #body
                  let-loan
               >
                  <tr>
                     <td class="whitespace-nowrap max-sm:text-xs">{{ folio(loan) }}</td>
                     <td class="max-md:hidden">
                        <span
                           class="rounded px-2 py-0.5 text-sm whitespace-nowrap text-white"
                           [class]="STATUS_COLORS[loan.status.slug] || 'bg-slate-500'"
                           >{{ loan.status.title }}</span
                        >
                     </td>
                     <td class="text-right! whitespace-nowrap text-green-600">{{ loan.amount | currency }}</td>
                     <td class="text-right! whitespace-nowrap text-green-600 max-lg:hidden">
                        {{ loan.total | currency }}
                     </td>
                     <td class="text-right! whitespace-nowrap max-xl:hidden">{{ loan.rate | number: '1.0-2' }}%</td>
                     <td class="text-right! max-xl:hidden">{{ loan.no_payments }}</td>
                     <td>
                        <div class="ml-auto flex w-fit items-center justify-end gap-1 sm:w-full">
                           @for (action of actions; track action.id) {
                              <button
                                 class="bg-second hover:bg-second-light focus:bg-second-light flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-all"
                                 type="button"
                                 tooltipPosition="top"
                                 [pTooltip]="action.tooltip | translate"
                                 [showDelay]="1500"
                                 (click)="handleAction({ action, loan })"
                              >
                                 <i [class]="'bx text-lg text-white ' + action.icon"></i>
                              </button>
                           }
                        </div>
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
         </div>

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
export class BorrowerLoansTableComponent {
   private readonly _list: BorrowerLoansService = inject(BorrowerLoansService);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly STATUS_COLORS: Record<string, string> = LOAN_STATUS_COLORS;
   public readonly $size: number = this._list.size;

   public readonly actions: RowAction[] = [
      { id: 'details', icon: 'bx-file-detail', tooltip: LOANS_I18N_KEYS.TOOLTIP_DETAILS },
      { id: 'payments', icon: 'bx-wallet', tooltip: LOANS_I18N_KEYS.TOOLTIP_PAYMENTS },
   ];

   public $details: OutputEmitterRef<LoanRow> = output({ alias: 'details' });
   public $payments: OutputEmitterRef<LoanRow> = output({ alias: 'payments' });

   public readonly $loans: Signal<LoanRow[]> = computed(() => this._list.loans);
   public readonly $total: Signal<number> = computed(() => this._list.total);
   public readonly $page: Signal<number> = computed(() => this._list.page);
   public readonly $loading: Signal<boolean> = computed(() => this._list.loading);
   public readonly $order: Signal<LoansOrder> = computed(() => this._list.order);

   public folio(loan: LoanRow): string {
      return compactFolio(loan.folio);
   }

   public handleAction({ action, loan }: { action: RowAction; loan: LoanRow }): void {
      if (action.id === 'details') this.$details.emit(loan);
      if (action.id === 'payments') this.$payments.emit(loan);
   }

   public handlePage(event: PaginatorState): void {
      this._list.changePage({ page: (event.page ?? 0) + 1 });
   }

   public handleOrder(): void {
      this._list.toggleOrder();
   }
}
