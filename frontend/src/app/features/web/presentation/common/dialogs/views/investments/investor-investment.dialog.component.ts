import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { CashCycle, FieldsInvestment } from '../../../../../../../interfaces/investment';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { InvestmentsService } from '../../../../../../data/services/investments.service';
import { InvestorBalanceService } from '../../../../../../data/services/investor-balance.service';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { INVESTMENTS_I18N_KEYS, termLabel } from '../../../../../../data/repository/investments.repository';
import { FieldErrorsComponent } from '../../../forms/field-errors/field-errors.component';
import { LoaderComponent } from '../../../forms/loader/loader.component';

/**
 * New investment of an investor: the available balance (read only), the amount
 * (never greater than it) & the term, one of the active cycles
 */
@Component({
   selector: 'fi-investor-investment-dialog-component',
   imports: [
      CurrencyPipe,
      FormField,
      FormsModule,
      TranslatePipe,
      IftaLabelModule,
      InputNumberModule,
      InputTextModule,
      SelectModule,
      FieldErrorsComponent,
      LoaderComponent,
   ],
   template: `
      @let form = $form;
      @let creating = $creating();

      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <p-iftalabel class="w-full">
            <input
               pInputText
               id="available"
               class="w-full bg-slate-200!"
               readonly
               tabindex="-1"
               [value]="$available() | currency"
            />
            <label for="available">{{ I18N.FIELD_AVAILABLE | translate }}</label>
         </p-iftalabel>

         <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <fi-field-errors-component
               class="w-full"
               [field]="form.amount()"
            >
               <p-iftalabel class="w-full">
                  <p-inputnumber
                     class="w-full"
                     inputId="amount"
                     inputStyleClass="w-full"
                     mode="decimal"
                     prefix="$ "
                     locale="en-US"
                     [minFractionDigits]="0"
                     [maxFractionDigits]="2"
                     [formField]="form.amount"
                  />
                  <label for="amount">{{ I18N.FIELD_AMOUNT | translate }} *</label>
               </p-iftalabel>
            </fi-field-errors-component>

            <fi-field-errors-component
               class="w-full"
               [field]="form.cycle_id()"
            >
               <p-iftalabel class="w-full">
                  <p-select
                     class="w-full"
                     inputId="cycle"
                     styleClass="w-full"
                     optionLabel="reward_cycle"
                     optionValue="id"
                     appendTo="body"
                     [ngModelOptions]="{ standalone: true }"
                     [options]="$cycles()"
                     [disabled]="creating"
                     [ngModel]="form.cycle_id().value()"
                     (ngModelChange)="handleCycle($event)"
                     (onHide)="form.cycle_id().markAsTouched()"
                  >
                     <ng-template
                        #selectedItem
                        let-cycle
                     >
                        {{ term(cycle).key | translate: term(cycle).params }}
                     </ng-template>
                     <ng-template
                        #item
                        let-cycle
                     >
                        {{ term(cycle).key | translate: term(cycle).params }}
                     </ng-template>
                  </p-select>
                  <label for="cycle">{{ I18N.FIELD_TERM | translate }} *</label>
               </p-iftalabel>
            </fi-field-errors-component>
         </div>

         <div class="flex w-full flex-col-reverse items-center gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="creating"
               (click)="handleCancel()"
            >
               {{ FORMS.BUTTON_CLOSE | translate }}
            </button>
            <button
               class="bg-contrast flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="submit"
               [disabled]="creating"
               (click)="handleCreate()"
            >
               @if (creating) {
                  <fi-loader-component tone="white" />
               }
               {{ I18N.BUTTON_CREATE | translate }}
            </button>
         </div>
      </form>
   `,
})
export class InvestorInvestmentDialogComponent {
   private readonly _investments: InvestmentsService = inject(InvestmentsService);
   private readonly _balance: InvestorBalanceService = inject(InvestorBalanceService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = INVESTMENTS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;

   public readonly $form: SignalForm<FieldsInvestment> = this._investments.form;
   public readonly $cycles: Signal<CashCycle[]> = computed(() => this._investments.cycles);
   public readonly $creating: Signal<boolean> = computed(() => this._investments.creating);
   public readonly $available: Signal<number> = computed(() => this._balance.balance?.available ?? 0);

   public term(cycle: CashCycle) {
      return termLabel(cycle.reward_cycle);
   }

   public handleCycle(value: string | null): void {
      this.$form.cycle_id().value.set(value ?? '');
      this.$form.cycle_id().markAsTouched();
   }

   public handleCancel(): void {
      this._dialogs.dialogBack();
   }

   public handleCreate(): void {
      this._investments.create();
   }
}
