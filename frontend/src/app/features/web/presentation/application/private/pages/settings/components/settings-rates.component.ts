import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { SettingRatePeriod, SettingRateRow } from '../../../../../../../../interfaces/settings';
import {
   SETTINGS_I18N_KEYS,
   SETTINGS_PERIOD_I18N_KEYS,
} from '../../../../../../../data/repository/settings.repository';
import { FORMS_I18N_KEYS } from '../../../../../../../data/repository/forms.repository';
import { SettingValueComponent } from './setting-value.component';

@Component({
   selector: 'fi-settings-rates-component',
   imports: [TranslatePipe, TableModule, SettingValueComponent],
   template: `
      @let period = PERIODS[$period()];

      <section class="flex w-full flex-col gap-2 rounded-2xl border border-slate-500 p-4 sm:p-6">
         <h2 class="text-second text-lg font-medium">{{ $title() | translate }}</h2>

         <p-table
            class="block w-full max-sm:[&_td]:px-2! max-sm:[&_th]:px-2!"
            [value]="$rows()"
         >
            <ng-template #header>
               <tr>
                  <th>{{ I18N.HEAD_PERIOD | translate }}</th>
                  <th class="text-right!">{{ I18N.HEAD_INVESTOR | translate }}</th>
                  <th class="text-right!">{{ I18N.HEAD_VALUE | translate }}</th>
               </tr>
            </ng-template>
            <ng-template
               #body
               let-row
            >
               <tr>
                  <td class="whitespace-nowrap">
                     {{ row.period }} {{ (row.period === 1 ? period.one : period.other) | translate }}
                  </td>
                  <td class="text-right! whitespace-nowrap">
                     <fi-setting-value-component [setting]="row.investor" />
                  </td>
                  <td class="text-right! whitespace-nowrap">
                     <fi-setting-value-component [setting]="row.general" />
                  </td>
               </tr>
            </ng-template>
         </p-table>

         <button
            class="bg-second hover:bg-second-light focus:bg-second-light mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-white transition-all sm:ml-auto sm:w-auto"
            type="button"
            (click)="$edit.emit()"
         >
            <i class="bx bx-pencil text-xl"></i>
            <span class="text-sm">{{ I18N.BUTTON_EDIT | translate }}</span>
         </button>
      </section>
   `,
})
export class SettingsRatesComponent {
   public readonly PERIODS = SETTINGS_PERIOD_I18N_KEYS;
   public readonly I18N = {
      ...SETTINGS_I18N_KEYS,
      ...FORMS_I18N_KEYS,
   };

   public $edit: OutputEmitterRef<void> = output({ alias: 'edit' });
   public $title: InputSignal<string> = input.required<string>({ alias: 'title' });
   public $period: InputSignal<SettingRatePeriod> = input.required<SettingRatePeriod>({ alias: 'period' });
   public $rows: InputSignal<SettingRateRow[]> = input.required<SettingRateRow[]>({ alias: 'rows' });
}
