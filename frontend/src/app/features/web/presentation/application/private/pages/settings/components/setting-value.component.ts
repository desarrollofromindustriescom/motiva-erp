import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, input, InputSignal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Setting } from '../../../../../../../../interfaces/settings';
import { SETTINGS_I18N_KEYS } from '../../../../../../../data/repository/settings.repository';

@Component({
   selector: 'fi-setting-value-component',
   imports: [DecimalPipe, CurrencyPipe, TranslatePipe],
   template: `
      @let setting = $setting();

      @if (setting) {
         @switch (setting.unit) {
            @case ('percentage') {
               {{ setting.value | number: '1.0-2' }}%
            }
            @case ('monetary') {
               {{ setting.value | currency }}
            }
            @case ('weeks') {
               {{ setting.value }}
               {{ (setting.value === 1 ? I18N.UNIT_WEEK_ONE : I18N.UNIT_WEEK_OTHER) | translate }}
            }
         }
      } @else {
         <span>-</span>
      }
   `,
})
export class SettingValueComponent {
   public readonly I18N = SETTINGS_I18N_KEYS;

   public $setting: InputSignal<Setting | null> = input<Setting | null>(null, { alias: 'setting' });
}
