import { Component } from '@angular/core';
import { LoginPictureComponent } from './components/login-picture.component';
import { LoginWelcomeComponent } from './components/login-welcome.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
   selector: 'fi-login-page-component',
   template: `
      <section class="w-full h-dvh flex flex-col items-center justify-start">
         <div
            class="w-full gap-4 grid grid-cols-1 xl:grid-cols-2 grid-rows-1 flex-auto px-8 pt-8 items-center justify-items-center"
         >
            <fi-login-welcome-component class="h-full flex w-full md:w-5/6 lg:w-3/4 xl:w-full transition-all" />
            <fi-login-picture-component class="hidden xl:flex size-full" />
         </div>
         <p class="w-full flex items-center justify-center gap-1 text-main h-12 text-xs sm:text-base transition-all">
            {{ 'LOGIN_BUILD_BY' | translate }} <b>{{ 'FROM_INDUSTRIES' | translate }}</b>
         </p>
      </section>
   `,
   imports: [LoginPictureComponent, LoginWelcomeComponent, TranslatePipe],
})
export class LoginPageComponent {}
