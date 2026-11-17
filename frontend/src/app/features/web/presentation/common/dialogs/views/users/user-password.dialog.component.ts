import { Component, computed, DestroyRef, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CreatedUser } from '../../../../../../../interfaces/user';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { UserPasswordService } from '../../../../../../data/services/user-password.service';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';
import { UserCredentialsComponent } from '../../../forms/user-credentials/user-credentials.component';

/**
 * Shows the new credentials after regenerating a password so they can be
 * copied; the dialog is closed manually & the credentials are forgotten
 */
@Component({
   selector: 'fi-user-password-dialog-component',
   imports: [TranslatePipe, UserCredentialsComponent],
   template: `
      <div class="flex w-full flex-col gap-3">
         <p
            class="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-700"
         >
            <i class="bx bx-info-circle text-xl"></i>
            {{ I18N.PASSWORD_NOTICE | translate }}
         </p>

         <fi-user-credentials-component [credentials]="$credentials()" />

         <div class="flex w-full justify-end pt-2">
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all sm:w-auto"
               type="button"
               (click)="handleClose()"
            >
               {{ FORMS.BUTTON_CLOSE | translate }}
            </button>
         </div>
      </div>
   `,
})
export class UserPasswordDialogComponent {
   private readonly _password: UserPasswordService = inject(UserPasswordService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = USERS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;

   public readonly $credentials: Signal<CreatedUser | null> = computed(() => this._password.credentials);

   constructor() {
      // Every dialog layer draws the dialog on top of the history, so when this one is opened from
      // the detail dialog an extra instance of this component is destroyed with the previous layer.
      // The credentials are shared, so they are only forgotten when this dialog is no longer on top.
      inject(DestroyRef).onDestroy(() => {
         if (this._dialogs.dialogs.at(-1)?.component !== UserPasswordDialogComponent) this._password.clear();
      });
   }

   public handleClose(): void {
      this._dialogs.closeDialogs();
   }
}
