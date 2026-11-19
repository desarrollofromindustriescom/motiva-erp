import { Component, computed, inject, Signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { EditableProfile, FieldsNewUser } from '../../../../../../../interfaces/user';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { UserEditService } from '../../../../../../data/services/user-edit.service';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';
import { LoaderComponent } from '../../../forms/loader/loader.component';
import { TextFieldComponent } from '../../../forms/text-field/text-field.component';

/**
 * Edit dialog of investors & borrowers, it shows the saved data. The name
 * & the CURP are disabled, and the guarantee option is locked (checked)
 * when the borrower already has one.
 */
@Component({
   selector: 'fi-user-edit-dialog-component',
   imports: [FormField, TranslatePipe, LoaderComponent, TextFieldComponent],
   template: `
      @let form = $form;
      @let profile = $profile();
      @let loading = $loading();
      @let saving = $saving();
      @let withGuarantee = form.with_guarantee().value();

      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <fi-text-field-component
            id="fullname"
            [label]="I18N.FIELD_FULLNAME"
            [field]="form.fullname"
         />

         <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <fi-text-field-component
               id="phone_number"
               inputmode="numeric"
               [label]="I18N.FIELD_PHONE"
               [required]="true"
               [field]="form.phone_number"
            />
            <fi-text-field-component
               id="curp"
               [label]="I18N.FIELD_CURP"
               [field]="form.curp"
            />
         </div>

         @if (profile === 'borrower') {
            <fi-text-field-component
               id="address"
               [label]="I18N.FIELD_ADDRESS"
               [required]="true"
               [field]="form.address"
            />

            <h3 class="text-second pt-3 text-base font-medium">{{ I18N.SECTION_GUARANTEE | translate }}</h3>

            <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
               <fi-text-field-component
                  id="guarantee_fullname"
                  [label]="I18N.FIELD_FULLNAME"
                  [required]="withGuarantee"
                  [field]="form.guarantee_fullname"
               />
               <fi-text-field-component
                  id="guarantee_phone_number"
                  inputmode="numeric"
                  [label]="I18N.FIELD_PHONE"
                  [required]="withGuarantee"
                  [field]="form.guarantee_phone_number"
               />
            </div>
            <fi-text-field-component
               id="guarantee_address"
               [label]="I18N.FIELD_ADDRESS"
               [required]="withGuarantee"
               [field]="form.guarantee_address"
            />

            <label class="text-second flex w-fit items-center gap-2 text-sm">
               <input
                  class="accent-second size-4 cursor-pointer disabled:cursor-auto"
                  type="checkbox"
                  [formField]="form.with_guarantee"
               />
               {{ I18N.FIELD_WITH_GUARANTEE | translate }}
            </label>
         }

         @if (profile === 'investor') {
            <h3 class="text-second pt-3 text-base font-medium">{{ I18N.SECTION_BANK | translate }}</h3>

            <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
               <fi-text-field-component
                  id="account_clabe"
                  inputmode="numeric"
                  [label]="I18N.FIELD_CLABE"
                  [required]="true"
                  [field]="form.account_clabe"
               />
               <fi-text-field-component
                  id="account_bank"
                  [label]="I18N.FIELD_BANK"
                  [required]="true"
                  [field]="form.account_bank"
               />
            </div>
         }

         <div class="flex w-full flex-col-reverse items-center gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="saving"
               (click)="handleClose()"
            >
               {{ FORMS.BUTTON_CLOSE | translate }}
            </button>
            <button
               class="bg-contrast flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="submit"
               [disabled]="loading"
               (click)="handleSave()"
            >
               @if (saving) {
                  <fi-loader-component tone="white" />
               }
               {{ FORMS.BUTTON_SAVE | translate }}
            </button>
         </div>
      </form>
   `,
})
export class UserEditDialogComponent {
   private readonly _edit: UserEditService = inject(UserEditService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = USERS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;

   public readonly $form: SignalForm<FieldsNewUser> = this._edit.form;
   public readonly $profile: Signal<EditableProfile> = computed(() => this._edit.profile);
   public readonly $loading: Signal<boolean> = computed(() => this._edit.loading);
   public readonly $saving: Signal<boolean> = computed(() => this._edit.saving);

   public handleSave(): void {
      this._edit.save();
   }

   public handleClose(): void {
      this._dialogs.closeDialogs();
   }
}
