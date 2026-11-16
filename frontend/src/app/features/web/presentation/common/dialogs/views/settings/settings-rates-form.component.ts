import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FieldsRates, SettingRatePeriod } from '../../../../../../../interfaces/settings';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { SETTINGS_I18N_KEYS, SETTINGS_PERIOD_I18N_KEYS } from '../../../../../../data/repository/settings.repository';
import { SettingFieldComponent } from './setting-field.component';
import { SettingActionsComponent } from './setting-actions.component';

@Component({
   selector: 'fi-settings-rates-form-component',
   imports: [TranslatePipe, SettingFieldComponent, SettingActionsComponent],
   template: `
      @let form = $form();
      @let period = PERIODS[$period()];

      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <div
            class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
            [class.lg:grid-cols-4]="$rows().length > 3"
         >
            @for (row of $rows(); track row) {
               <fi-setting-field-component
                  [inputId]="'general_' + row"
                  [field]="form.general[row - 1]"
                  [label]="row + ' ' + ((row === 1 ? period.one : period.other) | translate)"
                  symbol="%"
               />
               <fi-setting-field-component
                  [inputId]="'investor_' + row"
                  [field]="form.investor[row - 1]"
                  [label]="I18N.FIELD_INVESTOR | translate"
                  symbol="%"
               />
            }
         </div>

         <fi-setting-actions-component
            [loading]="$loading()"
            (save)="$save.emit()"
            (cancel)="$cancel.emit()"
         />
      </form>
   `,
})
export class SettingsRatesFormComponent {
   public readonly I18N = SETTINGS_I18N_KEYS;
   public readonly PERIODS = SETTINGS_PERIOD_I18N_KEYS;

   public $form: InputSignal<SignalForm<FieldsRates>> = input.required<SignalForm<FieldsRates>>({ alias: 'form' });
   public $rows: InputSignal<number[]> = input.required<number[]>({ alias: 'rows' });
   public $period: InputSignal<SettingRatePeriod> = input.required<SettingRatePeriod>({ alias: 'period' });
   public $loading: InputSignal<boolean> = input(false, { alias: 'loading' });
   public $save: OutputEmitterRef<void> = output({ alias: 'save' });
   public $cancel: OutputEmitterRef<void> = output({ alias: 'cancel' });
}
