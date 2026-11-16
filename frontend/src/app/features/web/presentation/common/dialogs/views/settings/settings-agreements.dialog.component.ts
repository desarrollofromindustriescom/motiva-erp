import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsService } from '../../../../../../data/services/settings.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { SETTINGS_AGREEMENTS } from '../../../../../../data/repository/settings.repository';
import { FieldsAgreements } from '../../../../../../../interfaces/settings';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { SettingFieldComponent } from './setting-field.component';
import { SettingActionsComponent } from './setting-actions.component';

@Component({
   selector: 'fi-settings-agreements-dialog-component',
   imports: [TranslatePipe, SettingFieldComponent, SettingActionsComponent],
   template: `
      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
            <fi-setting-field-component
               inputId="agreement_weekly"
               symbol="%"
               [field]="$form.weekly"
               [label]="CONCEPTS['agreement_weekly'] | translate"
            />
            <fi-setting-field-component
               inputId="agreement_weeks_before"
               [field]="$form.weeks_before"
               [label]="CONCEPTS['agreement_weeks_before'] | translate"
            />
            <fi-setting-field-component
               inputId="agreement_weeks_after"
               [field]="$form.weeks_after"
               [label]="CONCEPTS['agreement_weeks_after'] | translate"
            />
         </div>

         <fi-setting-actions-component
            [loading]="$loading()"
            (save)="handleSave()"
            (cancel)="handleCancel()"
         />
      </form>
   `,
})
export class SettingsAgreementsDialogComponent {
   private readonly _settings: SettingsService = inject(SettingsService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly CONCEPTS: Record<string, string> = Object.fromEntries(
      SETTINGS_AGREEMENTS.map(({ slug, concept }) => [slug, concept]),
   );
   public readonly $form: SignalForm<FieldsAgreements> = this._settings.forms.agreements;
   public readonly $loading: Signal<boolean> = computed(() => this._settings.loader.agreements);

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
      this._settings.updateAgreements();
   }
}
