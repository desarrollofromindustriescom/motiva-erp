import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { disabled, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { EditableProfile, FieldsNewUser, UserDetail } from '../../../interfaces/user';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';
import { REGEX } from '../repository/regex.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { UsersListService } from './users-list.service';

const EMPTY_MODEL: FieldsNewUser = {
   fullname: '',
   phone_number: '',
   curp: '',
   address: '',
   with_guarantee: false,
   guarantee_fullname: '',
   guarantee_phone_number: '',
   guarantee_address: '',
   account_clabe: '',
   account_bank: '',
};

/**
 * Form & loaders of the edit dialog of investors & borrowers. The saved data is
 * loaded when the dialog opens. The name & the CURP are shown but can't be
 * edited, and a borrower that already has guarantee can change it but not remove it.
 */
@Injectable({ providedIn: 'root' })
export class UserEditService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _list: UsersListService = inject(UsersListService);

   private readonly routes: Record<'get' | 'update', EndpointData> = {
      get: { route: API_ROUTES.GETUSER, method: HTTP_METHODS.GET },
      update: { route: API_ROUTES.UPDATEUSER, method: HTTP_METHODS.PUT },
   };

   private readonly $id: WritableSignal<string | null> = signal(null);
   private readonly $profile: WritableSignal<EditableProfile> = signal('investor');
   private readonly $loadingData: WritableSignal<boolean> = signal(false);
   private readonly $saving: WritableSignal<boolean> = signal(false);
   private readonly $hadGuarantee: WritableSignal<boolean> = signal(false);
   private readonly $model: WritableSignal<FieldsNewUser> = signal({ ...EMPTY_MODEL });

   private readonly $busy: Signal<boolean> = computed(() => this.$loadingData() || this.$saving());

   private readonly $form: SignalForm<FieldsNewUser> = form(this.$model, (schema: FormSchema<FieldsNewUser>) => {
      const investor = (): boolean => this.$profile() === 'investor';
      const borrower = (): boolean => this.$profile() === 'borrower';
      const guarantee = (): boolean => borrower() && this.$model().with_guarantee;

      required(schema.phone_number, { message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.phone_number, 10, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });
      pattern(schema.phone_number, REGEX.PHONE, { message: FORMS_I18N_KEYS.VAL_PHONE });

      required(schema.address, { when: borrower, message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.address, 512, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });

      required(schema.account_clabe, { when: investor, message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.account_clabe, 18, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });
      pattern(schema.account_clabe, REGEX.CLABE, { message: FORMS_I18N_KEYS.VAL_CLABE });
      required(schema.account_bank, { when: investor, message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.account_bank, 128, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });

      required(schema.guarantee_fullname, { when: guarantee, message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.guarantee_fullname, 256, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });
      required(schema.guarantee_phone_number, { when: guarantee, message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.guarantee_phone_number, 10, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });
      pattern(schema.guarantee_phone_number, REGEX.PHONE, { message: FORMS_I18N_KEYS.VAL_PHONE });
      required(schema.guarantee_address, { when: guarantee, message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.guarantee_address, 512, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });

      // the name & the CURP are never editable
      disabled(schema.fullname, { when: () => true });
      disabled(schema.curp, { when: () => true });

      for (const field of [
         schema.phone_number,
         schema.address,
         schema.guarantee_fullname,
         schema.guarantee_phone_number,
         schema.guarantee_address,
         schema.account_clabe,
         schema.account_bank,
      ]) {
         disabled(field as any, { when: () => this.$busy() });
      }

      // a saved guarantee can't be removed, so its option is locked
      disabled(schema.with_guarantee, { when: () => this.$busy() || this.$hadGuarantee() });
   });

   public get form(): SignalForm<FieldsNewUser> {
      return this.$form;
   }

   public get profile(): EditableProfile {
      return this.$profile();
   }

   public get loading(): boolean {
      return this.$busy();
   }

   public get saving(): boolean {
      return this.$saving();
   }

   /**
    * Prepares the form for a user & loads its saved data into it
    */
   public async start({ id, profile }: { id: string; profile: EditableProfile }): Promise<void> {
      const { method, route } = this.routes.get;
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

      this.$id.set(id);
      this.$profile.set(profile);
      this.$hadGuarantee.set(false);
      this.$saving.set(false);
      this.$form().reset({ ...EMPTY_MODEL });
      this.$loadingData.set(true);
      this._dialogs.loading = true;

      try {
         const user: UserDetail = await firstValueFrom(
            this._http.request<UserDetail>(method, `${environment.apiUrl}${route}${id}`, { context }),
         );

         // another user was opened while this one was loading
         if (this.$id() !== id) return;

         const hasGuarantee: boolean = !!(
            user.guarantee_fullname ||
            user.guarantee_phone_number ||
            user.guarantee_address
         );

         this.$hadGuarantee.set(hasGuarantee);
         this.$form().reset({
            fullname: user.fullname,
            curp: user.curp ?? '',
            phone_number: user.phone_number ?? '',
            address: user.address ?? '',
            with_guarantee: hasGuarantee,
            guarantee_fullname: user.guarantee_fullname ?? '',
            guarantee_phone_number: user.guarantee_phone_number ?? '',
            guarantee_address: user.guarantee_address ?? '',
            account_clabe: user.account_clabe ?? '',
            account_bank: user.account_bank ?? '',
         });
      } catch {
         // the error interceptor already notified the user
         if (this.$id() === id) this._dialogs.closeDialogs();
      } finally {
         if (this.$id() === id) {
            this.$loadingData.set(false);
            this._dialogs.loading = false;
         }
      }
   }

   /**
    * Only the editable fields of the profile are sent; guarantee data
    * goes only when the borrower has or adds one
    */
   private payload(): Record<string, string | boolean> {
      const value: FieldsNewUser = this.$form().value();
      const trim = (text: string): string => text.trim();
      const body: Record<string, string | boolean> = { phone_number: trim(value.phone_number) };

      if (this.$profile() === 'investor') {
         body['account_clabe'] = trim(value.account_clabe);
         body['account_bank'] = trim(value.account_bank);

         return body;
      }

      body['address'] = trim(value.address);
      body['with_guarantee'] = value.with_guarantee;

      if (value.with_guarantee) {
         body['guarantee_fullname'] = trim(value.guarantee_fullname);
         body['guarantee_phone_number'] = trim(value.guarantee_phone_number);
         body['guarantee_address'] = trim(value.guarantee_address);
      }

      return body;
   }

   /**
    * Validates the form & saves the changes: closes the dialogs & refreshes the table
    */
   public save(): void {
      const id: string | null = this.$id();

      if (!id || this.$busy()) return;

      submit(this.$form, async () => {
         const { method, route } = this.routes.update;

         this.$saving.set(true);
         this._dialogs.loading = true;

         try {
            await firstValueFrom(
               this._http.request(method, `${environment.apiUrl}${route}${id}`, { body: this.payload() }),
            );

            this.$saving.set(false);
            this._dialogs.loading = false;
            this._dialogs.closeDialogs();
            this._list.reload();
         } catch {
            // the error interceptor already notifies the user
         } finally {
            this.$saving.set(false);
            this._dialogs.loading = false;
         }
      }).then((state: boolean) => {
         if (state) return;

         this._dialogs.alert({
            severity: 'error',
            title: FORMS_I18N_KEYS.ERROR_TITLE,
            text: FORMS_I18N_KEYS.VAL_COMPLETE_CORRECTLY,
         });
      });
   }
}
