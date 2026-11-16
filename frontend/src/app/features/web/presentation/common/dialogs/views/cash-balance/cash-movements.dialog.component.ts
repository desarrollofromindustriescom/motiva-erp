import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Movement } from '../../../../../../../interfaces/cash-balance';
import { CashMovementsService } from '../../../../../../data/services/cash-movements.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import {
   compactFolio,
   MOVEMENT_TYPE_I18N_KEYS,
   MOVEMENT_TYPE_SEVERITY,
   MOVEMENTS_I18N_KEYS,
   STATUS_SEVERITY,
   TagSeverity,
} from '../../../../../../data/repository/cash-balance.repository';
import { CashMovementDetailDialogComponent } from './cash-movement-detail.dialog.component';

@Component({
   selector: 'fi-cash-movements-dialog-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, TableModule, TagModule, TooltipModule, PaginatorModule],
   template: `
      @let movements = $movements();
      @let loading = $loading();

      <div class="flex w-full flex-col gap-2">
         <p-table
            class="block w-full max-sm:[&_td]:px-2! max-sm:[&_th]:px-2!"
            [value]="movements"
         >
            <ng-template #header>
               <tr>
                  <th>{{ I18N.HEAD_FOLIO | translate }}</th>
                  <th class="text-right!">{{ I18N.HEAD_AMOUNT | translate }}</th>
                  <th class="max-sm:hidden">{{ I18N.HEAD_DATE | translate }}</th>
                  <th>{{ I18N.HEAD_TYPE | translate }}</th>
                  <th class="max-md:hidden">{{ I18N.HEAD_STATUS | translate }}</th>
                  <th></th>
               </tr>
            </ng-template>
            <ng-template
               #body
               let-movement
            >
               <tr>
                  <td class="whitespace-nowrap">{{ folio(movement) }}</td>
                  <td
                     class="text-right! whitespace-nowrap"
                     [class.text-green-600]="movement.type === 'deposit'"
                     [class.text-red-500]="movement.type === 'withdrawal'"
                  >
                     {{ signedAmount(movement) | currency }}
                  </td>
                  <td class="max-sm:hidden">{{ movement.created_at | date: 'dd.MM.yyyy' }}</td>
                  <td>
                     <p-tag
                        [value]="TYPE_I18N[movement.type] | translate"
                        [severity]="TYPE_SEVERITY[movement.type]"
                     />
                  </td>
                  <td class="max-md:hidden">
                     <p-tag
                        [value]="movement.status.title"
                        [severity]="statusSeverity(movement)"
                     />
                  </td>
                  <td>
                     <div class="flex w-full justify-end">
                        <button
                           class="bg-second hover:bg-second-light focus:bg-second-light flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-all"
                           type="button"
                           tooltipPosition="top"
                           [pTooltip]="I18N.BUTTON_DETAILS | translate"
                           [showDelay]="1500"
                           (click)="handleDetails({ movement })"
                        >
                           <i class="bx bx-file text-xl text-white"></i>
                        </button>
                     </div>
                  </td>
               </tr>
            </ng-template>
            <ng-template #emptymessage>
               <tr>
                  <td
                     class="py-6 text-center"
                     colspan="6"
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
      </div>
   `,
})
export class CashMovementsDialogComponent {
   private readonly _movements: CashMovementsService = inject(CashMovementsService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = MOVEMENTS_I18N_KEYS;
   public readonly TYPE_I18N: Record<string, string> = MOVEMENT_TYPE_I18N_KEYS;
   public readonly TYPE_SEVERITY: Record<string, TagSeverity> = MOVEMENT_TYPE_SEVERITY;
   public readonly $size: number = this._movements.size;

   public readonly $movements: Signal<Movement[]> = computed(() => this._movements.movements);
   public readonly $total: Signal<number> = computed(() => this._movements.total);
   public readonly $page: Signal<number> = computed(() => this._movements.page);
   public readonly $loading: Signal<boolean> = computed(() => this._movements.loading);

   constructor() {
      effect(() => {
         const loading: boolean = this.$loading();
         untracked(() => (this._dialogs.loading = loading));
      });
   }

   public folio(movement: Movement): string {
      return compactFolio(movement.folio);
   }

   public signedAmount(movement: Movement): number {
      return movement.type === 'withdrawal' ? -movement.amount : movement.amount;
   }

   public statusSeverity(movement: Movement) {
      return STATUS_SEVERITY[movement.status.slug] ?? 'secondary';
   }

   public handlePage(event: PaginatorState): void {
      this._movements.changePage({ page: (event.page ?? 0) + 1 });
   }

   public handleDetails({ movement }: { movement: Movement }): void {
      this._movements.selected = movement;

      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.MOVEMENT_DETAIL_TITLE,
         titleParams: { folio: compactFolio(movement.folio) },
         component: CashMovementDetailDialogComponent,
         size: 'sm',
      });
   }
}
