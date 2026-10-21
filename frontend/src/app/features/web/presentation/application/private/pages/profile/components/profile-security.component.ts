import { Component, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PROFILE_I18N_KEYS } from '../../../../../../../data/repository/profile.repository';
import { FORMS_I18N_KEYS } from '../../../../../../../data/repository/forms.repository';

@Component({
   selector: 'fi-profile-secutiry-component',
   imports: [TranslatePipe],
   template: `
      <section class="w-full flex items-center justify-between p-6 rounded-2xl border border-slate-500">
         <h2 class="font-medium text-second text-lg">{{ I18N.SECTION_TITLE_SECUTIRY | translate }}</h2>
         <button
            class="bg-second rounded-xl flex items-center justify-center gap-2 text-white px-5 py-3 cursor-pointer hover:bg-second-light focus:bg-second-light transition-all"
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
