import { CurrencyPipe } from '@angular/common';
import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { FieldsCashMovement } from '../../../../../../../interfaces/cash-balance';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { FieldErrorsComponent } from '../../../forms/field-errors/field-errors.component';

@Component({
   selector: 'fi-cash-movement-form-component',
   imports: [
      CurrencyPipe,
      FormField,
      TranslatePipe,
      IftaLabelModule,
      InputNumberModule,
      InputTextModule,
      FieldErrorsComponent,
   ],
   template: `
      @let form = $form();

      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
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
                  <label for="amount">{{ $fieldLabel() | translate }} *</label>
               </p-iftalabel>
            </fi-field-errors-component>

            <p-iftalabel class="w-full">
               <input
                  pInputText
                  id="total"
                  class="w-full bg-slate-200!"
                  readonly
                  tabindex="-1"
                  [value]="$total() | currency"
               />
               <label for="total">{{ $totalLabel() | translate }}</label>
            </p-iftalabel>
         </div>

         <div class="flex w-full flex-col items-center gap-2 pt-2 sm:flex-row-reverse sm:justify-start">
            <button
               class="bg-contrast w-full cursor-pointer rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="submit"
               [disabled]="$loading()"
               (click)="$save.emit()"
            >
               {{ $actionLabel() | translate }}
            </button>
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="$loading()"
               (click)="$cancel.emit()"
            >
               {{ I18N.BUTTON_CLOSE | translate }}
            </button>
         </div>
      </form>
   `,
})
export class CashMovementFormComponent {
   public readonly I18N = FORMS_I18N_KEYS;

   public $form: InputSignal<SignalForm<FieldsCashMovement>> = input.required<SignalForm<FieldsCashMovement>>({
      alias: 'form',
   });
   public $fieldLabel: InputSignal<string> = input.required<string>({ alias: 'fieldLabel' });
   public $totalLabel: InputSignal<string> = input.required<string>({ alias: 'totalLabel' });
   public $actionLabel: InputSignal<string> = input.required<string>({ alias: 'actionLabel' });
   public $total: InputSignal<number> = input(0, { alias: 'total' });
   public $loading: InputSignal<boolean> = input(false, { alias: 'loading' });

   public $save: OutputEmitterRef<void> = output({ alias: 'save' });
   public $cancel: OutputEmitterRef<void> = output({ alias: 'cancel' });
}
