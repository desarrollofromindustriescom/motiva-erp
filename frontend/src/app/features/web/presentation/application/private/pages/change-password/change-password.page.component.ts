import { Component, computed, effect, EffectCleanupRegisterFn, inject, Signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { Session } from '../../../../../../../interfaces/session';
import { FieldsChangePassword } from '../../../../../../../interfaces/user';
import { ASSETS_DIR, ICONS } from '../../../../../../data/repository/assets.repository';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { PATHS } from '../../../../../../data/repository/navigation.repository';
import { PASSWORD_PAGE_I18N_KEYS } from '../../../../../../data/repository/password.repository';
import { SessionService } from '../../../../../../data/services/session.service';
import { UsersService } from '../../../../../../data/services/users.service';
import { PasswordFieldsComponent } from '../../../../common/forms/password-fields/password-fields.component';

/**
 * Full screen (without the menu of the app) shown while the user hasn't changed the
 * password it was given: it's the only place it can go, apart from logging out.
 * It leaves by itself once the session says the password was changed.
 */
@Component({
   selector: 'fi-change-password-page-component',
   imports: [PasswordFieldsComponent, TranslatePipe],
   template: `
      @let session = $session();
      @let loading = $loading();

      <section class="flex min-h-dvh w-full items-center justify-center bg-white p-4">
         <form
            class="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-500 p-5 sm:p-8"
            (submit)="$event.preventDefault()"
         >
            <img
               class="h-12 self-center"
               [src]="logo"
               alt="Crédito Motiva"
            />

            <div class="flex flex-col gap-1">
               @if (session) {
                  <span
                     class="text-main text-sm font-medium"
                     id="greeting"
                  >
                     {{ I18N.GREETING | translate: { name: session.fullname } }}
                  </span>
               }
               <h1 class="text-second text-xl font-medium sm:text-2xl">{{ I18N.TITLE | translate }}</h1>
               <p class="text-sm text-slate-600">{{ I18N.TEXT | translate }}</p>
            </div>

            <fi-password-fields-component [form]="$form" />

            <div class="flex w-full flex-col gap-2">
               <button
                  class="bg-contrast w-full cursor-pointer rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60"
                  id="change"
                  type="submit"
                  [disabled]="loading"
                  (click)="handleChange()"
               >
                  {{ FORMS.BUTTON_CHANGE_PASSWORD | translate }}
               </button>
               <button
                  class="text-second w-full cursor-pointer rounded-lg px-6 py-2 text-sm transition-all hover:bg-slate-100 disabled:cursor-auto disabled:opacity-60"
                  id="logout"
                  type="button"
                  [disabled]="loading"
                  (click)="handleLogout()"
               >
                  {{ FORMS.BUTTON_LOGOUT | translate }}
               </button>
            </div>
         </form>
      </section>
   `,
})
export class ChangePasswordPageComponent {
   private readonly _router: Router = inject(Router);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _users: UsersService = inject(UsersService);

   public readonly I18N = PASSWORD_PAGE_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;
   public readonly logo: string = ASSETS_DIR.ICONS + ICONS.MOTIVA_LOGO;

   public readonly $form: SignalForm<FieldsChangePassword> = this._users.forms.changePassword;
   public readonly $session: Signal<Session | null> = computed(() => this._session.session);
   public readonly $loading: Signal<boolean> = computed(() => this._users.loader.changePassword);

   constructor() {
      effect((onCleanup: EffectCleanupRegisterFn) =>
         onCleanup(() => this._users.resetForm({ form: 'changePassword' })),
      );

      // once the password is changed there is nothing left to do here
      effect(() => {
         if (this.$session()?.password_changed) untracked(() => this._router.navigate([PATHS.ROOT, PATHS.APP]));
      });
   }

   public handleChange(): void {
      this._users.changePassword();
   }

   public handleLogout(): void {
      this._users.logout();
   }
}
