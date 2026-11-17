import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { disabled, form, maxLength, minLength, pattern, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { CreatableProfile, CreatedUser, FieldsNewUser } from '../../../interfaces/user';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';
import { REGEX } from '../repository/regex.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';

const EMPTY_MODEL: FieldsNewUser = {
   fullname: '',
   phone_number: '',
   curp: '',
   address: '',
   with_guarantee: true,
   guarantee_fullname: '',
   guarantee_phone_number: '',
   guarantee_address: '',
   account_clabe: '',
   account_bank: '',
};

/**
 * Form, loader & result of the user creation dialogs. Every profile shares
 * the same form, the profile decides which fields are required & sent.
 */
@Injectable({ providedIn: 'root' })
export class UserCreationService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   private readonly route: EndpointData = { route: API_ROUTES.CREATEUSER, method: HTTP_METHODS.POST };

   private readonly $profile: WritableSignal<CreatableProfile> = signal('administrator');
   private readonly $loading: WritableSignal<boolean> = signal(false);
   private readonly $credentials: WritableSignal<CreatedUser | null> = signal(null);
   private readonly $model: WritableSignal<FieldsNewUser> = signal({ ...EMPTY_MODEL });

   // once the credentials exist the form can't be edited anymore
   private readonly $locked: Signal<boolean> = computed(() => this.$loading() || this.$credentials() !== null);

   private readonly $form: SignalForm<FieldsNewUser> = form(this.$model, (schema: FormSchema<FieldsNewUser>) => {
      const contact = (): boolean => ['investor', 'borrower'].includes(this.$profile());
      const investor = (): boolean => this.$profile() === 'investor';
      const borrower = (): boolean => this.$profile() === 'borrower';
      const guarantee = (): boolean => borrower() && this.$model().with_guarantee;

      required(schema.fullname, { message: FORMS_I18N_KEYS.VAL_REQUIRED });
      minLength(schema.fullname, 3, { message: FORMS_I18N_KEYS.VAL_MIN_LENGTH });
      maxLength(schema.fullname, 128, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });

      required(schema.phone_number, { when: contact, message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.phone_number, 10, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });
      pattern(schema.phone_number, REGEX.PHONE, { message: FORMS_I18N_KEYS.VAL_PHONE });
      required(schema.curp, { when: contact, message: FORMS_I18N_KEYS.VAL_REQUIRED });
      maxLength(schema.curp, 18, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });
      pattern(schema.curp, REGEX.CURP, { message: FORMS_I18N_KEYS.VAL_CURP });

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

      for (const field of [
         schema.fullname,
         schema.phone_number,
         schema.curp,
         schema.address,
         schema.with_guarantee,
         schema.guarantee_fullname,
         schema.guarantee_phone_number,
         schema.guarantee_address,
         schema.account_clabe,
         schema.account_bank,
      ]) {
         disabled(field as any, { when: () => this.$locked() });
      }
   });

   public get form(): SignalForm<FieldsNewUser> {
      return this.$form;
   }

   public get profile(): CreatableProfile {
      return this.$profile();
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get credentials(): CreatedUser | null {
      return this.$credentials();
   }

   /**
    * Clears the form for a new user of the given profile
    * (borrowers start with the guarantee option checked)
    */
   public start({ profile }: { profile: CreatableProfile }): void {
      this.$profile.set(profile);
      this.$credentials.set(null);
      this.$loading.set(false);
      this.$form().reset({ ...EMPTY_MODEL });
   }

   /**
    * Fields that belong to the profile; guarantee data is only
    * sent when the borrower keeps the guarantee option checked
    */
   private payload(): Record<string, string | boolean> {
      const profile: CreatableProfile = this.$profile();
      const value: FieldsNewUser = this.$form().value();
      const trim = (text: string): string => text.trim();
      const body: Record<string, string | boolean> = { profile, fullname: trim(value.fullname) };

      if (profile === 'investor' || profile === 'borrower') {
         body['phone_number'] = trim(value.phone_number);
         body['curp'] = trim(value.curp).toUpperCase();
      }

      if (profile === 'investor') {
         body['account_clabe'] = trim(value.account_clabe);
         body['account_bank'] = trim(value.account_bank);
      }

      if (profile === 'borrower') {
         body['address'] = trim(value.address);
         body['with_guarantee'] = value.with_guarantee;

         if (value.with_guarantee) {
            body['guarantee_fullname'] = trim(value.guarantee_fullname);
            body['guarantee_phone_number'] = trim(value.guarantee_phone_number);
            body['guarantee_address'] = trim(value.guarantee_address);
         }
      }

      return body;
   }

   /**
    * Validates the form & creates the user, the generated
    * credentials are stored to be shown in the dialog
    */
   public create(): void {
      submit(this.$form, async () => {
         const { method, route } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         this.$loading.set(true);
         this._dialogs.loading = true;

         try {
            const created: CreatedUser = await firstValueFrom(
               this._http.request<CreatedUser>(method, `${environment.apiUrl}${route}`, {
                  body: this.payload(),
                  context,
               }),
            );

            this.$credentials.set(created);
         } catch {
            // the error interceptor already notifies the user
         } finally {
            this.$loading.set(false);
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
