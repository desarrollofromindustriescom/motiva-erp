import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CONTACT } from '../../../../../../../data/repository/contact.repository';
import { PhoneFormatPipe } from '../../../../../../utilities/pipes/phone-format.pipe';
import { ASSETS_DIR, ICONS } from '../../../../../../../data/repository/assets.repository';
import { LOGIN_I18N_KEYS } from '../../../../../../../data/repository/login.repository';

@Component({
   selector: 'fi-login-welcome-component',
   imports: [TranslatePipe],
   providers: [PhoneFormatPipe],
   template: `
      <div
         class="flex size-full flex-col items-start justify-between rounded-xl border border-black/30 px-6 py-4 transition-all sm:px-12 sm:py-8 md:px-24 md:py-12"
      >
         <div class="flex flex-col">
            <!-- the picture with the logo is hidden below xl, so the logo goes here -->
            <img
               class="mb-6 h-16 self-start sm:h-20 xl:hidden"
               [src]="logo"
               alt="Motiva"
            />
            <h1 class="text-second text-xl font-bold transition-all sm:text-2xl md:text-4xl">
               {{ I18N.TITLE | translate }}
            </h1>
            <span class="text-main text-xs transition-all sm:text-sm">{{ I18N.SUBTITLE | translate }}</span>
         </div>

         <ng-content />

         <ul class="flex flex-col gap-1">
            @for (contact of contactMedia; track $index) {
               <li class="flex items-center justify-start gap-2">
                  <i [class]="'text-main bx text-xl ' + contact.icon"></i>
                  <a
                     [href]="contact.link"
                     class="text-main text-sm transition-all sm:text-base"
                     >{{ contact.text }}</a
                  >
               </li>
            }
         </ul>
      </div>
   `,
})
export class LoginWelcomeComponent {
   private pPhoneFormat: PhoneFormatPipe = inject(PhoneFormatPipe);

   public readonly I18N = LOGIN_I18N_KEYS;
   public readonly logo: string = ASSETS_DIR.ICONS + ICONS.MOTIVA_LOGO;

   public readonly contactMedia: {
      icon: string;
      link: string;
      text: string;
   }[] = [
      {
         icon: 'bx-envelope-alt',
         link: `mailto:${CONTACT.EMAIL}`,
         text: CONTACT.EMAIL,
      },
      {
         icon: 'bx-phone',
         link: `tel:${CONTACT.PHONE_NUMBER}`,
         text: this.pPhoneFormat.transform(CONTACT.PHONE_NUMBER),
      },
   ];
}
