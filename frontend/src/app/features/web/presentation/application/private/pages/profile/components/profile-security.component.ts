import { Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PROFILE_I18N_KEYS } from '../../../../../../../data/repository/profile.repository';
import { FORMS_I18N_KEYS } from '../../../../../../../data/repository/forms.repository';

@Component({
   selector: 'fi-profile-secutiry-component',
   imports: [TranslatePipe],
   template: `
      <section
         class="flex w-full flex-col gap-3 rounded-2xl border border-slate-500 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
         <h2 class="text-second text-lg font-medium">{{ I18N.SECTION_TITLE_SECUTIRY | translate }}</h2>
         <button
            class="bg-second hover:bg-second-light focus:bg-second-light flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-white transition-all sm:w-auto"
            (click)="$changePassword.emit()"
         >
            <i class="bx bx-lock-keyhole text-2xl"></i>
            <span>{{ I18N.BUTTON_CHANGE_PASSWORD | translate }}</span>
         </button>
      </section>
   `,
})
export class ProfileSecutiryComponent {
   public readonly I18N = {
      ...PROFILE_I18N_KEYS,
      ...FORMS_I18N_KEYS,
   };

   public $changePassword: OutputEmitterRef<void> = output({ alias: 'changePassword' });
}
