import { Component, computed, effect, EffectCleanupRegisterFn, inject, Signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { UsersService } from '../../../../../../data/services/users.service';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { FieldsChangePassword } from '../../../../../../../interfaces/user';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { PasswordFieldsComponent } from '../../../forms/password-fields/password-fields.component';

@Component({
   selector: 'fi-change-password-dialog-component',
   imports: [PasswordFieldsComponent, TranslatePipe],
   template: `
      @let loading = $loading();

      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <fi-password-fields-component [form]="$form" />
         <div class="flex w-full flex-col items-center gap-2 sm:flex-row-reverse sm:justify-start">
            <button
               class="bg-contrast w-full cursor-pointer rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="submit"
               [disabled]="loading"
               (click)="handleContinue()"
            >
               {{ I18N.BUTTON_CHANGE | translate }}
            </button>
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="loading"
               (click)="handleCancel()"
            >
               {{ I18N.BUTTON_CANCEL | translate }}
            </button>
         </div>
      </form>
   `,
})
export class ChangePasswordDialogComponent {
   private readonly _users: UsersService = inject(UsersService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = FORMS_I18N_KEYS;

   public readonly $loading: Signal<boolean> = computed(() => this._users.loader.changePassword);
   public readonly $form: SignalForm<FieldsChangePassword> = this._users.forms.changePassword;

   constructor() {
      effect((onCleanup: EffectCleanupRegisterFn) =>
         onCleanup(() => this._users.resetForm({ form: 'changePassword' })),
      );
      effect(() => {
         const loading: boolean = this.$loading();
         untracked(() => (this._dialogs.loading = loading));
      });
   }

   public handleCancel(): void {
      this._dialogs.closeDialogs();
   }

   public handleContinue(): void {
      this._users.changePassword();
   }
}
