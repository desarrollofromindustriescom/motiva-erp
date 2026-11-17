import { NgClass } from '@angular/common';
import {
   Component,
   effect,
   ElementRef,
   input,
   InputSignal,
   signal,
   Signal,
   viewChild,
   WritableSignal,
} from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputIconModule } from 'primeng/inputicon';
import { InputPasswordModule } from 'primeng/inputpassword';
import { SignalForm } from '../../../../../../interfaces/alias';
import { FieldsChangePassword } from '../../../../../../interfaces/user';
import { FORMS_I18N_KEYS } from '../../../../../data/repository/forms.repository';
import { FieldErrorsComponent } from '../field-errors/field-errors.component';

/**
 * The three fields to change a password (current, new & confirmation), each one
 * with its own button to show it. Used by the dialog of the profile and by the
 * screen that forces the change.
 */
@Component({
   selector: 'fi-password-fields-component',
   imports: [
      FieldErrorsComponent,
      IftaLabelModule,
      InputPasswordModule,
      IconFieldModule,
      InputIconModule,
      FormField,
      NgClass,
      TranslatePipe,
   ],
   template: `
      @let form = $form();
      @let currentHidden = $hidden().current;
      @let newHidden = $hidden().new;
      @let confirmHidden = $hidden().confirm;

      <div class="flex w-full flex-col gap-2">
         <fi-field-errors-component
            class="w-full"
            [field]="form.current_password()"
         >
            <p-iftalabel class="w-full">
               <p-iconfield>
                  <input
                     #currentPassword
                     pInputPassword
                     id="current_password"
                     class="transition-all"
                     [fluid]="true"
                     [formField]="form.current_password"
                     [mask]="currentHidden"
                  />
                  <p-inputicon
                     class="bx -translate-y-1/2 cursor-pointer"
                     (click)="handleToggle({ field: 'current' })"
                     [ngClass]="{
                        'bx-eye': currentHidden,
                        'bx-eye-slash': !currentHidden,
                     }"
                  />
               </p-iconfield>
               <label for="current_password">{{ I18N.FIELD_CURRENT_PASSWORD | translate }} *</label>
            </p-iftalabel>
         </fi-field-errors-component>
         <fi-field-errors-component
            class="w-full"
            [field]="form.new_password()"
         >
            <p-iftalabel class="w-full">
               <p-iconfield>
                  <input
                     pInputPassword
                     id="new_password"
                     class="transition-all"
                     [fluid]="true"
                     [formField]="form.new_password"
                     [mask]="newHidden"
                  />
                  <p-inputicon
                     class="bx -translate-y-1/2 cursor-pointer"
                     (click)="handleToggle({ field: 'new' })"
                     [ngClass]="{
                        'bx-eye': newHidden,
                        'bx-eye-slash': !newHidden,
                     }"
                  />
               </p-iconfield>
               <label for="new_password">{{ I18N.FIELD_NEW_PASSWORD | translate }} *</label>
            </p-iftalabel>
         </fi-field-errors-component>
         <fi-field-errors-component
            class="w-full"
            [field]="form.confirm_password()"
         >
            <p-iftalabel class="w-full">
               <p-iconfield>
                  <input
                     pInputPassword
                     id="confirm_password"
                     class="transition-all"
                     [fluid]="true"
                     [formField]="form.confirm_password"
                     [mask]="confirmHidden"
                  />
                  <p-inputicon
                     class="bx -translate-y-1/2 cursor-pointer"
                     (click)="handleToggle({ field: 'confirm' })"
                     [ngClass]="{
                        'bx-eye': confirmHidden,
                        'bx-eye-slash': !confirmHidden,
                     }"
                  />
               </p-iconfield>
               <label for="confirm_password">{{ I18N.FIELD_CONFIRM_PASSWORD | translate }} *</label>
            </p-iftalabel>
         </fi-field-errors-component>
      </div>
   `,
})
export class PasswordFieldsComponent {
   public readonly I18N = FORMS_I18N_KEYS;

   public $form: InputSignal<SignalForm<FieldsChangePassword>> = input.required<SignalForm<FieldsChangePassword>>({
      alias: 'form',
   });

   public readonly $hidden: WritableSignal<{ current: boolean; new: boolean; confirm: boolean }> = signal({
      current: true,
      new: true,
      confirm: true,
   });

   public $currentPasswordTag: Signal<ElementRef<HTMLInputElement> | undefined> = viewChild('currentPassword');

   constructor() {
      // the first field is focused when it's shown
      effect(() => {
         const tag: ElementRef<HTMLInputElement> | undefined = this.$currentPasswordTag();

         if (tag) tag.nativeElement.focus();
      });
   }

   public handleToggle({ field }: { field: 'current' | 'new' | 'confirm' }): void {
      this.$hidden.update((previous: Record<typeof field, boolean>) => ({ ...previous, [field]: !previous[field] }));
   }
}
