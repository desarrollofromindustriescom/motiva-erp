import { Component, computed, inject, Signal } from '@angular/core';
import { LoginPictureComponent } from './components/login-picture.component';
import { LoginWelcomeComponent } from './components/login-welcome.component';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthenticationService } from '../../../../../../data/services/authentication.service';
import { SessionService } from '../../../../../../data/services/session.service';
import { Router } from '@angular/router';
import { PATHS } from '../../../../../../data/repository/navigation.repository';
import { FOOTER_I18N_KEYS } from '../../../../../../data/repository/layout.repository';
import { LoginFormComponent } from './components/login-form.component';
import { FieldTree } from '@angular/forms/signals';
import { AuthenticationLoader, FieldsLogin } from '../../../../../../../interfaces/authentication';

@Component({
   selector: 'fi-login-page-component',
   imports: [LoginPictureComponent, LoginWelcomeComponent, TranslatePipe, LoginFormComponent],
   template: `
      @let loader = $loader();

      <section class="flex h-dvh w-full flex-col items-center justify-start">
         <div
            class="grid w-full flex-auto grid-cols-1 grid-rows-1 items-center justify-items-center gap-4 px-8 pt-8 xl:grid-cols-2"
         >
            <fi-login-welcome-component class="flex h-full w-full transition-all md:w-5/6 lg:w-3/4 xl:w-full">
               <fi-login-form-component
                  class="w-full"
                  [form]="$form"
                  [loading]="loader.login || loader.validate"
                  (login)="handleLogin()"
               />
            </fi-login-welcome-component>
            <fi-login-picture-component class="hidden size-full xl:flex" />
         </div>
         <p class="text-main flex h-12 w-full items-center justify-center gap-1 text-xs transition-all sm:text-base">
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

   public readonly $loader: Signal<Record<AuthenticationLoader, boolean>> = computed(() => this._authentication.loader);
   public readonly $form: FieldTree<FieldsLogin, string | number, 'writable'> = this._authentication.forms.login;

   constructor() {
      const { validate } = this.$loader();

      if (validate) return;

      this._authentication
         .recoverSession({
            hideError: true,
         })
         .then(() => {
            if (this._session.token && this._session.session) this._router.navigate([PATHS.ROOT, PATHS.APP]);
         });
   }

   public handleLogin(): void {
      this._authentication.login();
   }
}
