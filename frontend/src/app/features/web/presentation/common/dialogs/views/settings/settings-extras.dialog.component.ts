import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsService } from '../../../../../../data/services/settings.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { SETTINGS_EXTRAS } from '../../../../../../data/repository/settings.repository';
import { FieldsExtras } from '../../../../../../../interfaces/settings';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { SettingFieldComponent } from './setting-field.component';
import { SettingActionsComponent } from './setting-actions.component';

@Component({
   selector: 'fi-settings-extras-dialog-component',
   imports: [TranslatePipe, SettingFieldComponent, SettingActionsComponent],
   template: `
      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <fi-setting-field-component
               inputId="mora"
               symbol="%"
               [field]="$form.mora"
               [label]="CONCEPTS['mora'] | translate"
            />
            <fi-setting-field-component
               inputId="visit"
               symbol="$"
               [field]="$form.visit"
               [label]="CONCEPTS['visit'] | translate"
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
export class SettingsExtrasDialogComponent {
   private readonly _settings: SettingsService = inject(SettingsService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly CONCEPTS: Record<string, string> = Object.fromEntries(
      SETTINGS_EXTRAS.map(({ slug, concept }) => [slug, concept]),
   );
   public readonly $form: SignalForm<FieldsExtras> = this._settings.forms.extras;
   public readonly $loading: Signal<boolean> = computed(() => this._settings.loader.extras);

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
      this._settings.updateExtras();
   }
}
