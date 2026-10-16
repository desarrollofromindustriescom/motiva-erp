import { NgClass } from '@angular/common';
import { Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { ButtonDirective } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputIconModule } from 'primeng/inputicon';
import { InputPasswordModule } from 'primeng/inputpassword';
import { InputTextModule } from 'primeng/inputtext';
import { LabelModule } from 'primeng/label';
import { FieldsLogin } from '../../../../../../../interfaces/authentication';
import { AuthenticationService } from '../../../../../../data/services/authentication.service';
import { TranslatePipe } from '@ngx-translate/core';
import { LOGIN_I18N_KEYS } from '../../../../../../data/repository/login.repository';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';

@Component({
   selector: 'fi-login-form-component',
   imports: [
      IftaLabelModule,
      InputTextModule,
      InputPasswordModule,
      IconFieldModule,
      InputIconModule,
      NgClass,
      LabelModule,
      ButtonDirective,
      TranslatePipe,
      FormField,
   ],
   template: `
      @let passwordVisibility = $passwordVisibility();
      @let loading = $loading();

      <form
         class="flex flex-col w-full gap-3"
         (submit)="$event.preventDefault()"
      >
         <div class="flex items-end">
            <h2 class="w-full text-lg sm:text-xl md:text-2xl text-second transition-all">
               {{ I18N.LOGIN.FORM_TITLE | translate }}
            </h2>

            @if (loading) {
               <span class="italic text-main animate-pulse text-sm sm:text-base transition-all">
                  {{ I18N.FORMS.LOADING_DOTS | translate }}
               </span>
            }
         </div>

         <p-iftalabel class="w-full">
            <input
               pInputText
               id="username"
               type="text"
               autocomplete="off"
               [fluid]="true"
               [formField]="$form.username"
            />

            <label for="username">{{ I18N.FORMS.FIELD_USERNAME | translate }}</label>
         </p-iftalabel>

         <p-iftalabel class="w-full">
            <p-iconfield>
               <input
                  pInputPassword
                  id="password"
                  class="transition-all"
                  [fluid]="true"
                  [formField]="$form.password"
                  [(mask)]="$passwordVisibility"
               />
               <p-inputicon
                  class="cursor-pointer -translate-y-1/2 bx"
                  (click)="handlePasswordToggle()"
                  [ngClass]="{
                     'bx-eye': passwordVisibility,
                     'bx-eye-slash': !passwordVisibility,
                  }"
               />
            </p-iconfield>
            <label for="password">{{ I18N.FORMS.FIELD_PASSWORD | translate }}</label>
         </p-iftalabel>

         <button
            pButton
            class="bg-contrast! w-full sm:w-fit px-6! ml-auto text-sm sm:text-base transition-all"
            [disabled]="loading"
            (click)="handleLogin()"
         >
            {{ I18N.FORMS.SIGNIN_BUTTON | translate }}
         </button>
      </form>
   `,
})
export class LoginFormComponent {
   private readonly _authentication: AuthenticationService = inject(AuthenticationService);

   public readonly I18N = {
      LOGIN: LOGIN_I18N_KEYS,
      FORMS: FORMS_I18N_KEYS,
   };

   public readonly $passwordVisibility: WritableSignal<boolean> = signal(true);
   public readonly $form: FieldTree<FieldsLogin, string | number, 'writable'> = this._authentication.forms.login;
   public readonly $loading: Signal<boolean> = computed(() => this._authentication.loading);

   constructor() {}

   public handlePasswordToggle(): void {
      this.$passwordVisibility.update((value: boolean) => !value);
   }

   public handleLogin(): void {
      this._authentication.login();
   }
}
