import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';

@Component({
   selector: 'fi-setting-actions-component',
   imports: [TranslatePipe],
   template: `
      <div class="flex w-full flex-row-reverse items-center justify-start gap-2 pt-2">
         <button
            class="bg-contrast cursor-pointer rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60"
            type="button"
            [disabled]="$loading()"
            (click)="$save.emit()"
         >
            {{ I18N.BUTTON_SAVE | translate }}
         </button>
         <button
            class="cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60"
            type="button"
            [disabled]="$loading()"
            (click)="$cancel.emit()"
         >
            {{ I18N.BUTTON_CLOSE | translate }}
         </button>
      </div>
   `,
})
export class SettingActionsComponent {
   public readonly I18N = FORMS_I18N_KEYS;

   public $loading: InputSignal<boolean> = input(false, { alias: 'loading' });
   public $save: OutputEmitterRef<void> = output({ alias: 'save' });
   public $cancel: OutputEmitterRef<void> = output({ alias: 'cancel' });
}
