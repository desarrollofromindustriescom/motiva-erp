import {
   Component,
   computed,
   effect,
   EffectCleanupRegisterFn,
   ElementRef,
   inject,
   Signal,
   signal,
   untracked,
   viewChild,
   WritableSignal,
} from '@angular/core';
import { FieldErrorsComponent } from '../../forms/field-errors/field-errors.component';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputPasswordModule } from 'primeng/inputpassword';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { UsersService } from '../../../../../data/services/users.service';
import { FieldTree, FormField } from '@angular/forms/signals';
import { FieldsChangePassword } from '../../../../../../interfaces/user';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FORMS_I18N_KEYS } from '../../../../../data/repository/forms.repository';
import { DialogsService } from '../../../../../data/services/dialogs.service';

@Component({
   selector: 'fi-change-password-dialog-component',
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
      @let loading = $loading();
      @let currentVisibility = $passwordsVisibility().current;
      @let newVisibility = $passwordsVisibility().new;
      @let confirmVisibility = $passwordsVisibility().confirm;

      <form
         class="w-full flex flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <fi-field-errors-component
            class="w-full"
            [field]="$form.current_password()"
         >
            <p-iftalabel class="w-full">
               <p-iconfield>
                  <input
                     #currentPassword
                     pInputPassword
                     id="current_password"
                     class="transition-all"
                     [fluid]="true"
                     [formField]="$form.current_password"
                     [mask]="currentVisibility"
                  />
                  <p-inputicon
                     class="cursor-pointer -translate-y-1/2 bx"
                     (click)="handlePasswordToggle({ field: 'current' })"
                     [ngClass]="{
                        'bx-eye': currentVisibility,
                        'bx-eye-slash': !currentVisibility,
                     }"
                  />
               </p-iconfield>
               <label for="current_password">{{ I18N.FIELD_CURRENT_PASSWORD | translate }} *</label>
            </p-iftalabel>
         </fi-field-errors-component>
         <fi-field-errors-component
            class="w-full"
            [field]="$form.new_password()"
         >
            <p-iftalabel class="w-full">
               <p-iconfield>
                  <input
                     pInputPassword
                     id="new_password"
                     class="transition-all"
                     [fluid]="true"
                     [formField]="$form.new_password"
                     [mask]="newVisibility"
                  />
                  <p-inputicon
                     class="cursor-pointer -translate-y-1/2 bx"
                     (click)="handlePasswordToggle({ field: 'new' })"
                     [ngClass]="{
                        'bx-eye': newVisibility,
                        'bx-eye-slash': !newVisibility,
                     }"
                  />
               </p-iconfield>
               <label for="new_password">{{ I18N.FIELD_NEW_PASSWORD | translate }} *</label>
            </p-iftalabel>
         </fi-field-errors-component>
         <fi-field-errors-component
            class="w-full"
            [field]="$form.confirm_password()"
         >
            <p-iftalabel class="w-full">
               <p-iconfield>
                  <input
                     pInputPassword
                     id="confirm_password"
                     class="transition-all"
                     [fluid]="true"
                     [formField]="$form.confirm_password"
                     [mask]="confirmVisibility"
                  />
                  <p-inputicon
                     class="cursor-pointer -translate-y-1/2 bx"
                     (click)="handlePasswordToggle({ field: 'confirm' })"
                     [ngClass]="{
                        'bx-eye': confirmVisibility,
                        'bx-eye-slash': !confirmVisibility,
                     }"
                  />
               </p-iconfield>
               <label for="confirm_password">{{ I18N.FIELD_CONFIRM_PASSWORD | translate }} *</label>
            </p-iftalabel>
         </fi-field-errors-component>
         <div class="w-full flex flex-row-reverse items-center justify-start gap-2">
            <button
               class="rounded-lg bg-contrast text-white py-2 px-6 disabled:opacity-60 cursor-pointer disabled:cursor-auto transition-all"
               [disabled]="loading"
               (click)="handleContinue()"
            >
               {{ I18N.BUTTON_CHANGE | translate }}
            </button>
            <button
               class="rounded-lg bg-red-500 text-white py-2 px-6 disabled:opacity-60 cursor-pointer disabled:cursor-auto transition-all"
               [disabled]="loading"
               (click)="handleCancel()"
            >
               {{ I18N.BUTTON_CANCEL | translate }}
            </button>
         </div>
      </form>
   `,
})
export class ChangePasswordDialogComponent {
   private readonly _users: UsersService = inject(UsersService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = FORMS_I18N_KEYS;

   public readonly $loading: Signal<boolean> = computed(() => this._users.loading);
   public readonly $form: FieldTree<FieldsChangePassword, string | number, 'writable'> =
      this._users.forms.changePassword;
   public readonly $passwordsVisibility: WritableSignal<{ current: boolean; new: boolean; confirm: boolean }> = signal({
      current: false,
      new: false,
      confirm: false,
   });

   public $currentPasswordTag: Signal<ElementRef<HTMLInputElement> | undefined> = viewChild('currentPassword');

   public handlePasswordToggle({ field }: { field: 'current' | 'new' | 'confirm' }): void {
      this.$passwordsVisibility.update((previous: Record<typeof field, boolean>) => {
         const state: Partial<typeof previous> = {};

         state[field] = !previous[field];

         return {
            ...previous,
            ...state,
         };
      });
   }

   constructor() {
      effect((onCleanup: EffectCleanupRegisterFn) =>
         onCleanup(() => this._users.resetForm({ form: 'changePassword' })),
      );
      effect(() => {
         const loading: boolean = this.$loading();
         untracked(() => (this._dialogs.loading = loading));
      });
      effect(() => {
         const currentPasswordTag: ElementRef<HTMLInputElement> | undefined = this.$currentPasswordTag();

         if (!currentPasswordTag) return;

         currentPasswordTag.nativeElement.focus();
      });
   }

   public handleCancel(): void {
      this._dialogs.closeDialogs();
   }

   public handleContinue(): void {
      this._users.changePassword();
   }
}
