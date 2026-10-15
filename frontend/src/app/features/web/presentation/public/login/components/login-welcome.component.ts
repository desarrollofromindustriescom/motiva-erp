import { Component, inject } from '@angular/core';
import { LoginFormComponent } from './login-form.component';
import { TranslatePipe } from '@ngx-translate/core';
import { CONTACT } from '../../../../../data/repository/contact.repository';
import { PhoneFormatPipe } from '../../../../utilities/pipes/phone-format.pipe';
import { LOGIN_I18N_KEYS } from '../../../../../data/repository/login.repository';

@Component({
   selector: 'fi-login-welcome-component',
   template: `
      <div
         class="border border-black/30 rounded-xl py-4 sm:py-8 md:py-12 px-6 sm:px-12 md:px-24 flex flex-col items-start justify-between size-full transition-all"
      >
         <div class="flex flex-col">
            <h1 class="text-xl sm:text-2xl md:text-4xl text-second font-bold transition-all">
               {{ I18N.TITLE | translate }}
            </h1>
            <span class="text-xs sm:text-sm text-main transition-all">{{ I18N.SUBTITLE | translate }}</span>
         </div>

         <fi-login-form-component class="w-full" />

         <ul class="flex flex-col gap-1">
            @for (contact of contactMedia; track $index) {
               <li class="flex items-center justify-start gap-2">
                  <i [class]="'text-main text-xl bx ' + contact.icon"></i>
                  <a
                     [href]="contact.link"
                     class="text-sm sm:text-base text-main transition-all"
                     >{{ contact.text }}</a
                  >
               </li>
            }
         </ul>
      </div>
   `,
   imports: [LoginFormComponent, TranslatePipe],
   providers: [PhoneFormatPipe],
})
export class LoginWelcomeComponent {
   private pPhoneFormat: PhoneFormatPipe = inject(PhoneFormatPipe);

   public readonly I18N = LOGIN_I18N_KEYS;

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
