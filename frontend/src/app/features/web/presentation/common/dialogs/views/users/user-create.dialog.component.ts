import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputTextModule } from 'primeng/inputtext';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { CreatableProfile, CreatedUser, FieldsNewUser } from '../../../../../../../interfaces/user';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { UserCreationService } from '../../../../../../data/services/user-creation.service';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';
import { LoaderComponent } from '../../../forms/loader/loader.component';
import { TextFieldComponent } from '../../../forms/text-field/text-field.component';

type CopyKey = 'username' | 'password';

/**
 * One dialog for every creatable profile (administrator, manager, investor
 * & borrower): the fields shown depend on the profile of the service
 */
@Component({
   selector: 'fi-user-create-dialog-component',
   imports: [FormField, TranslatePipe, IftaLabelModule, InputTextModule, LoaderComponent, TextFieldComponent],
   template: `
      @let form = $form;
      @let profile = $profile();
      @let loading = $loading();
      @let credentials = $credentials();
      @let withGuarantee = form.with_guarantee().value();

      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <fi-text-field-component
            id="fullname"
            [label]="I18N.FIELD_FULLNAME"
            [required]="true"
            [field]="form.fullname"
         />

         @if (profile === 'investor' || profile === 'borrower') {
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
                  [required]="true"
                  [field]="form.curp"
               />
            </div>
         }

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

            <label class="text-second flex w-fit cursor-pointer items-center gap-2 text-sm">
               <input
                  class="accent-second size-4 cursor-pointer"
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

         <div class="flex w-full justify-end pt-2">
            <button
               class="bg-contrast flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="loading || credentials !== null"
               (click)="handleGenerate()"
            >
               @if (loading) {
                  <fi-loader-component tone="white" />
               }
               {{ I18N.BUTTON_GENERATE | translate }}
            </button>
         </div>

         <div class="flex w-full flex-col gap-2 pt-4">
            @for (item of credentialFields; track item.key) {
               <div class="relative w-full">
                  <p-iftalabel class="w-full">
                     <input
                        pInputText
                        class="w-full bg-slate-200! pr-12!"
                        readonly
                        tabindex="-1"
                        [id]="item.key"
                        [value]="credentials ? credentials[item.key] : ''"
                     />
                     <label [for]="item.key">{{ item.label | translate }}</label>
                  </p-iftalabel>

                  <button
                     class="text-second absolute top-1/2 right-3 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg p-1.5 transition-all hover:bg-slate-300 disabled:cursor-auto disabled:opacity-40 disabled:hover:bg-transparent"
                     type="button"
                     [disabled]="!credentials"
                     (click)="handleCopy({ key: item.key })"
                  >
                     <i [class]="'bx text-xl ' + ($copied() === item.key ? 'bx-check' : 'bx-copy')"></i>
                  </button>
               </div>
            }
         </div>

         <div class="flex w-full justify-end pt-2">
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="loading"
               (click)="handleClose()"
            >
               {{ FORMS.BUTTON_CLOSE | translate }}
            </button>
         </div>
      </form>
   `,
})
export class UserCreateDialogComponent {
   private readonly _creation: UserCreationService = inject(UserCreationService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = USERS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;
   public readonly credentialFields: { key: CopyKey; label: string }[] = [
      { key: 'username', label: USERS_I18N_KEYS.FIELD_USERNAME },
      { key: 'password', label: USERS_I18N_KEYS.FIELD_PASSWORD },
   ];

   public readonly $form: SignalForm<FieldsNewUser> = this._creation.form;
   public readonly $profile: Signal<CreatableProfile> = computed(() => this._creation.profile);
   public readonly $loading: Signal<boolean> = computed(() => this._creation.loading);
   public readonly $credentials: Signal<CreatedUser | null> = computed(() => this._creation.credentials);
   public readonly $copied: WritableSignal<CopyKey | null> = signal(null);

   public handleGenerate(): void {
      this._creation.create();
   }

   /**
    * Copies one credential & shows a check for a moment
    */
   public handleCopy({ key }: { key: CopyKey }): void {
      const credentials: CreatedUser | null = this._creation.credentials;

      if (!credentials) return;

      navigator.clipboard
         .writeText(credentials[key])
         .then(() => {
            this.$copied.set(key);
            setTimeout(
               () => this.$copied.update((current: CopyKey | null) => (current === key ? null : current)),
               1500,
            );
         })
         .catch(() => undefined);
   }

   public handleClose(): void {
      this._dialogs.closeDialogs();
   }
}
