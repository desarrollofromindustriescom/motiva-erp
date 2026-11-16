import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';
import { Movement } from '../../../../../../../interfaces/cash-balance';
import { CashMovementsService } from '../../../../../../data/services/cash-movements.service';
import {
   MOVEMENT_TYPE_I18N_KEYS,
   MOVEMENT_TYPE_SEVERITY,
   MOVEMENTS_I18N_KEYS,
   STATUS_SEVERITY,
} from '../../../../../../data/repository/cash-balance.repository';
import { USER_PROFILE_I18N_KEYS, USER_PROFILE_SEVERITY } from '../../../../../../data/repository/profile.repository';

@Component({
   selector: 'fi-cash-movement-detail-dialog-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, TagModule],
   template: `
      @let movement = $movement();

      @if (movement) {
         <div class="flex w-full flex-col gap-6">
            <dl class="flex w-full flex-col text-sm">
               <div class="flex flex-col gap-1 border-b border-slate-300 py-2 sm:flex-row sm:items-center sm:gap-4">
                  <dt class="text-second w-48 shrink-0">{{ I18N.DETAIL_FOLIO | translate }}</dt>
                  <dd class="text-second/80 wrap-anywhere">{{ movement.folio }}</dd>
               </div>
               <div class="flex flex-col gap-1 border-b border-slate-300 py-2 sm:flex-row sm:items-center sm:gap-4">
                  <dt class="text-second w-48 shrink-0">{{ I18N.DETAIL_AMOUNT | translate }}</dt>
                  <dd
                     [class.text-green-600]="movement.type === 'deposit'"
                     [class.text-red-500]="movement.type === 'withdrawal'"
                  >
                     {{ signedAmount(movement) | currency }} MXN
                  </dd>
               </div>
               <div class="flex flex-col gap-1 border-b border-slate-300 py-2 sm:flex-row sm:items-center sm:gap-4">
                  <dt class="text-second w-48 shrink-0">{{ I18N.DETAIL_DATE | translate }}</dt>
                  <dd class="text-second/80">{{ movement.created_at | date: 'dd.MM.yyyy' }}</dd>
               </div>
               <div class="flex flex-col gap-1 border-b border-slate-300 py-2 sm:flex-row sm:items-center sm:gap-4">
                  <dt class="text-second w-48 shrink-0">{{ I18N.DETAIL_TYPE | translate }}</dt>
                  <dd>
                     <p-tag
                        [value]="TYPE_I18N[movement.type] | translate"
                        [severity]="TYPE_SEVERITY[movement.type]"
                     />
                  </dd>
               </div>
               <div class="flex flex-col gap-1 border-b border-slate-300 py-2 sm:flex-row sm:items-center sm:gap-4">
                  <dt class="text-second w-48 shrink-0">{{ I18N.DETAIL_STATUS | translate }}</dt>
                  <dd>
                     <p-tag
                        [value]="movement.status.title"
                        [severity]="statusSeverity(movement)"
                     />
                  </dd>
               </div>
            </dl>

            <section class="flex w-full flex-col gap-2">
               <h3 class="text-second text-base font-medium">{{ I18N.EXECUTOR_TITLE | translate }}</h3>
               <dl class="flex w-full flex-col text-sm">
                  <div class="flex flex-col gap-1 border-b border-slate-300 py-2 sm:flex-row sm:items-center sm:gap-4">
                     <dt class="text-second w-48 shrink-0">{{ I18N.EXECUTOR_FULLNAME | translate }}</dt>
                     <dd class="text-second/80 wrap-anywhere">{{ movement.user.fullname }}</dd>
                  </div>
                  <div class="flex flex-col gap-1 border-b border-slate-300 py-2 sm:flex-row sm:items-center sm:gap-4">
                     <dt class="text-second w-48 shrink-0">{{ I18N.EXECUTOR_USERNAME | translate }}</dt>
                     <dd class="text-second/80 wrap-anywhere">{{ movement.user.username }}</dd>
                  </div>
                  <div class="flex flex-col gap-1 border-b border-slate-300 py-2 sm:flex-row sm:items-center sm:gap-4">
                     <dt class="text-second w-48 shrink-0">{{ I18N.EXECUTOR_PROFILE | translate }}</dt>
                     <dd>
                        <p-tag
                           [value]="PROFILE_I18N[movement.user.profile] | translate"
                           [severity]="PROFILE_SEVERITY[movement.user.profile]"
                        />
                     </dd>
                  </div>
               </dl>
            </section>
         </div>
      }
   `,
})
export class CashMovementDetailDialogComponent {
   private readonly _movements: CashMovementsService = inject(CashMovementsService);

   public readonly I18N = MOVEMENTS_I18N_KEYS;
   public readonly TYPE_I18N = MOVEMENT_TYPE_I18N_KEYS;
   public readonly TYPE_SEVERITY = MOVEMENT_TYPE_SEVERITY;
   public readonly PROFILE_I18N = USER_PROFILE_I18N_KEYS;
   public readonly PROFILE_SEVERITY = USER_PROFILE_SEVERITY;

   public readonly $movement: Signal<Movement | null> = computed(() => this._movements.selected);

   public signedAmount(movement: Movement): number {
      return movement.type === 'withdrawal' ? -movement.amount : movement.amount;
   }

   public statusSeverity(movement: Movement) {
      return STATUS_SEVERITY[movement.status.slug] ?? 'secondary';
   }
}
