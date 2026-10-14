import { CommonModule } from '@angular/common';
import { Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { ButtonDirective } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputIconModule } from 'primeng/inputicon';
import { InputPasswordModule } from 'primeng/inputpassword';
import { InputTextModule } from 'primeng/inputtext';
import { LabelModule } from 'primeng/label';
import { FieldsLogin } from '../../../../../../interfaces/auth';
import { AuthService } from '../../../../../data/services/auth.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
   selector: 'fi-login-form-component',
   template: `
      @let passwordVisibility = $passwordVisibility();
      @let loading = $loading();

      <form
         class="flex flex-col w-full gap-3"
         (submit)="$event.preventDefault()"
      >
         <div class="flex items-end">
            <h2 class="w-full text-lg sm:text-xl md:text-2xl text-second transition-all">
               {{ 'LOGIN_FORM_TITLE' | translate }}
            </h2>

            @if (loading) {
               <span class="italic text-main animate-pulse text-sm sm:text-base transition-all">{{
                  'LOADING-DOTS' | translate
               }}</span>
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

            <label for="username">{{ 'LOGIN_FORM_USERNAME' | translate }}</label>
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
                  (click)="passwordToggle()"
                  [ngClass]="{
                     'bx-eye': passwordVisibility,
                     'bx-eye-slash': !passwordVisibility,
                  }"
               />
            </p-iconfield>
            <label for="password">{{ 'LOGIN_FORM_PASSWORD' | translate }}</label>
         </p-iftalabel>

         <button
            pButton
            class="bg-contrast! w-full sm:w-fit px-6! ml-auto text-sm sm:text-base transition-all"
            [disabled]="loading"
            (click)="login()"
         >
            {{ 'LOGIN_FORM_SIGNIN_BUTTON' | translate }}
         </button>
      </form>
   `,
   imports: [
      IftaLabelModule,
      InputTextModule,
      InputPasswordModule,
      IconFieldModule,
      InputIconModule,
      CommonModule,
      LabelModule,
      ButtonDirective,
      TranslatePipe,
      FormField,
   ],
})
export class LoginFormComponent {
   private readonly _auth: AuthService = inject(AuthService);

   public readonly $passwordVisibility: WritableSignal<boolean> = signal(true);
   public readonly $form: FieldTree<FieldsLogin, string | number, 'writable'> = this._auth.forms.login;
   public readonly $loading: Signal<boolean> = computed(() => this._auth.loading);

   constructor() {}

   public passwordToggle(): void {
      this.$passwordVisibility.update((value: boolean) => !value);
   }

   public login(): void {
      this._auth.login();
   }
}
