import { NgClass } from '@angular/common';
import { Component, input, InputSignal, output, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { IconFieldModule } from 'primeng/iconfield';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputIconModule } from 'primeng/inputicon';
import { InputPasswordModule } from 'primeng/inputpassword';
import { InputTextModule } from 'primeng/inputtext';
import { LabelModule } from 'primeng/label';
import { FieldsLogin } from '../../../../../../../../interfaces/authentication';
import { TranslatePipe } from '@ngx-translate/core';
import { LOGIN_I18N_KEYS } from '../../../../../../../data/repository/login.repository';
import { FORMS_I18N_KEYS } from '../../../../../../../data/repository/forms.repository';
import { LoaderComponent } from '../../../../../common/forms/loader/loader.component';

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
      TranslatePipe,
      FormField,
      LoaderComponent,
   ],
   template: `
      @let passwordHidden = $passwordHidden();
      @let loading = $loading();
      @let $formTree = $form();

      <form
         class="flex w-full flex-col gap-3"
         (submit)="$event.preventDefault()"
      >
         <div class="flex items-end">
            <h2 class="text-second w-full text-2xl transition-all sm:text-xl md:text-2xl">
               {{ I18N.LOGIN.FORM_TITLE | translate }}
            </h2>

            @if (loading) {
               <fi-loader-component />
            }
         </div>

         <p-iftalabel class="w-full">
            <input
               pInputText
               id="username"
               type="text"
               autocomplete="off"
               [fluid]="true"
               [formField]="$formTree.username"
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
                  [formField]="$formTree.password"
                  [mask]="passwordHidden"
               />
               <p-inputicon
                  class="bx -translate-y-1/2 cursor-pointer"
                  (click)="handlePasswordToggle()"
                  [ngClass]="{
                     'bx-eye': passwordHidden,
                     'bx-eye-slash': !passwordHidden,
                  }"
               />
            </p-iconfield>
            <label for="password">{{ I18N.FORMS.FIELD_PASSWORD | translate }}</label>
         </p-iftalabel>

         <button
            class="bg-contrast ml-auto w-full cursor-pointer rounded-lg px-6 py-2 text-lg text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-fit sm:text-base"
            [disabled]="loading"
            (click)="$login.emit()"
         >
            {{ I18N.FORMS.BUTTON_SIGNIN | translate }}
         </button>
      </form>
   `,
})
export class LoginFormComponent {
   public readonly I18N = {
      LOGIN: LOGIN_I18N_KEYS,
      FORMS: FORMS_I18N_KEYS,
   };

   public $loading: InputSignal<boolean> = input(false, { alias: 'loading' });
   public $form: InputSignal<FieldTree<FieldsLogin, string | number, 'writable'>> = input.required({ alias: 'form' });
   public $login: OutputEmitterRef<void> = output({ alias: 'login' });

   public readonly $passwordHidden: WritableSignal<boolean> = signal(true);

   constructor() {}

   public handlePasswordToggle(): void {
      this.$passwordHidden.update((value: boolean) => !value);
   }
}
