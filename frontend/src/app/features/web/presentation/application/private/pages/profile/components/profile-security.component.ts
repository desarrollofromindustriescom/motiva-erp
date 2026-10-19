import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PROFILE_I18N_KEYS } from '../../../../../../../data/repository/profile.repository';
import { FORMS_I18N_KEYS } from '../../../../../../../data/repository/forms.repository';
import { DialogsService } from '../../../../../../../data/services/dialogs.service';
import { ChangePasswordDialogComponent } from '../../../../../common/dialogs/change-password/change-password.dialog.component';
import { DIALOG_I18N_KEYS } from '../../../../../../../data/repository/dialog.repository';

@Component({
   selector: 'fi-profile-secutiry-component',
   imports: [TranslatePipe],
   template: `
      <section class="w-full flex items-center justify-between p-6 rounded-2xl border border-slate-500">
         <h2 class="font-medium text-second text-lg">{{ I18N.SECTION_TITLE_SECUTIRY | translate }}</h2>
         <button
            class="bg-second rounded-xl flex items-center justify-center gap-2 text-white px-5 py-3 cursor-pointer hover:bg-second-light focus:bg-second-light transition-all"
            (click)="handleChangePassword()"
         >
            <i class="bx bx-lock-keyhole text-2xl"></i>
            <span>{{ I18N.BUTTON_CHANGE_PASSWORD | translate }}</span>
         </button>
      </section>
   `,
})
export class ProfileSecutiryComponent {
   private readonly _dialogs: DialogsService = inject(DialogsService);
   public readonly I18N = {
      ...PROFILE_I18N_KEYS,
      ...FORMS_I18N_KEYS,
   };

   constructor() {}

   public handleChangePassword(): void {
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.CHANGE_PASSWORD_TITLE,
         component: ChangePasswordDialogComponent,
      });
   }
}
