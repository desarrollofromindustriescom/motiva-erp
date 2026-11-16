import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { SettingsService } from '../../../../../../data/services/settings.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { SETTINGS_MONTHLY_PERIODS } from '../../../../../../data/repository/settings.repository';
import { FieldsRates } from '../../../../../../../interfaces/settings';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { SettingsRatesFormComponent } from './settings-rates-form.component';

@Component({
   selector: 'fi-settings-monthly-dialog-component',
   imports: [SettingsRatesFormComponent],
   template: `
      <fi-settings-rates-form-component
         period="month"
         [form]="$form"
         [rows]="rows"
         [loading]="$loading()"
         (save)="handleSave()"
         (cancel)="handleCancel()"
      />
   `,
})
export class SettingsMonthlyDialogComponent {
   private readonly _settings: SettingsService = inject(SettingsService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly rows: number[] = Array.from({ length: SETTINGS_MONTHLY_PERIODS }, (_, index: number) => index + 1);
   public readonly $form: SignalForm<FieldsRates> = this._settings.forms.monthly;
   public readonly $loading: Signal<boolean> = computed(() => this._settings.loader.monthly);

   constructor() {
      effect(() => {
         const loading: boolean = this.$loading();
         untracked(() => (this._dialogs.loading = loading));
      });
   }

   public handleCancel(): void {
      this._dialogs.closeDialogs();
   }

   public handleSave(): void {
      this._settings.updateMonthly();
   }
}
