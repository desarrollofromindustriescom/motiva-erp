import { Component, inject } from '@angular/core';
import { LoginPictureComponent } from './components/login-picture.component';
import { LoginWelcomeComponent } from './components/login-welcome.component';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthenticationService } from '../../../../../../data/services/authentication.service';
import { SessionService } from '../../../../../../data/services/session.service';
import { Router } from '@angular/router';
import { PATHS } from '../../../../../../data/repository/navigation.repository';
import { FOOTER_I18N_KEYS } from '../../../../../../data/repository/layout.repository';

@Component({
   selector: 'fi-login-page-component',
   imports: [LoginPictureComponent, LoginWelcomeComponent, TranslatePipe],
   template: `
      <section class="w-full h-dvh flex flex-col items-center justify-start">
         <div
            class="w-full gap-4 grid grid-cols-1 xl:grid-cols-2 grid-rows-1 flex-auto px-8 pt-8 items-center justify-items-center"
         >
            <fi-login-welcome-component class="h-full flex w-full md:w-5/6 lg:w-3/4 xl:w-full transition-all" />
            <fi-login-picture-component class="hidden xl:flex size-full" />
         </div>
         <p class="w-full flex items-center justify-center gap-1 text-main h-12 text-xs sm:text-base transition-all">
            {{ I18N.BUILD_BY | translate }} <b>{{ I18N.BUSINESS | translate }}</b>
         </p>
      </section>
   `,
})
export class LoginPageComponent {
   private readonly _router: Router = inject(Router);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _authentication: AuthenticationService = inject(AuthenticationService);

   public readonly I18N = FOOTER_I18N_KEYS;

   constructor() {
      if (this._authentication.loading) return;

      this._authentication
         .recoverSession({
            hideError: true,
         })
         .then(() => {
            if (this._session.token && this._session.session) this._router.navigate([PATHS.ROOT, PATHS.APP]);
         });
   }
}
