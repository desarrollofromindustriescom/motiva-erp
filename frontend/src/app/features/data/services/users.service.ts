import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { EndpointData } from '../../../interfaces/api';
import { FieldsChangePassword, UsersForms, UsersRoutes } from '../../../interfaces/user';
import { API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import {
   ChildFieldContext,
   disabled,
   form,
   minLength,
   pattern,
   required,
   submit,
   validate,
} from '@angular/forms/signals';
import { REGEX } from '../repository/regex.repository';
import { FORMS_CUSTOM_VALIDATIONS, FORMS_I18N_KEYS } from '../repository/forms.repository';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _session: SessionService = inject(SessionService);

   private readonly routes: Record<UsersRoutes, EndpointData> = {
      changePassword: { route: API_ROUTES.CHANGEPASSWORD, method: HTTP_METHODS.PATCH },
      logout: { route: API_ROUTES.LOGOUT, method: HTTP_METHODS.POST },
   };

   private readonly $loading: WritableSignal<boolean> = signal(false);

   private readonly $modelChangePassword: WritableSignal<FieldsChangePassword> = signal({
      current_password: '',
      new_password: '',
      confirm_password: '',
   });

   private readonly $formChangePassword: SignalForm<FieldsChangePassword> = form(
      this.$modelChangePassword,
      (schema: FormSchema<FieldsChangePassword>) => {
         const when = ({ state }: ChildFieldContext<string>) => state.touched();

         required(schema.current_password, { when, message: FORMS_I18N_KEYS.VAL_REQUIRED });
         required(schema.new_password, { when, message: FORMS_I18N_KEYS.VAL_REQUIRED });
         required(schema.confirm_password, { when, message: FORMS_I18N_KEYS.VAL_REQUIRED });

         minLength(schema.current_password, 8, { when, message: FORMS_I18N_KEYS.VAL_MIN_LENGTH });
         minLength(schema.new_password, 8, { when, message: FORMS_I18N_KEYS.VAL_MIN_LENGTH });
         minLength(schema.confirm_password, 8, { when, message: FORMS_I18N_KEYS.VAL_MIN_LENGTH });

         pattern(schema.current_password, REGEX.SECURE_PASSWORD, {
            when,
            message: FORMS_I18N_KEYS.VAL_PASSWORD_PATTERN,
         });
         pattern(schema.new_password, REGEX.SECURE_PASSWORD, { when, message: FORMS_I18N_KEYS.VAL_PASSWORD_PATTERN });
         pattern(schema.confirm_password, REGEX.SECURE_PASSWORD, {
            when,
            message: FORMS_I18N_KEYS.VAL_PASSWORD_PATTERN,
         });

         validate(schema.new_password, ({ value, valueOf, state }: ChildFieldContext<string>) => {
            const currentPassword: string = valueOf(schema.current_password);
            const newPassword: string = value();

            if (!state.touched() || !currentPassword || !newPassword || currentPassword !== newPassword) return null;

            return {
               kind: FORMS_CUSTOM_VALIDATIONS.SAME_AS_CURRENT,
               message: FORMS_I18N_KEYS.VAL_SAME_AS_CURRENT,
            };
         });

         validate(schema.confirm_password, ({ value, valueOf, state }: ChildFieldContext<string>) => {
            const newPassword: string = valueOf(schema.new_password);
            const confirmPassword: string = value();

            if (!state.touched() || !newPassword || !confirmPassword || confirmPassword === newPassword) return null;

            return {
               kind: FORMS_CUSTOM_VALIDATIONS.PASSWORD_MISMATCH,
               message: FORMS_I18N_KEYS.VAL_PASSWORD_MISMATCH,
            };
         });

         disabled(schema.current_password, { when: () => this.$loading() });
         disabled(schema.new_password, { when: () => this.$loading() });
         disabled(schema.confirm_password, { when: () => this.$loading() });
      },
   );

   constructor() {}

   public get loading(): boolean {
      return this.$loading();
   }

   public get forms(): UsersForms {
      return {
         changePassword: this.$formChangePassword,
      };
   }

   /**
    *
    */
   public resetForm({ form }: { form: keyof UsersForms }): void {
      switch (form) {
         case 'changePassword':
            this.$formChangePassword().reset({
               current_password: '',
               new_password: '',
               confirm_password: '',
            });
      }
   }

   /**
    *
    */
   public changePassword(): void {
      this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_CHANGE_PASSWORD }).then(() =>
         submit(
            this.$formChangePassword,
            async () =>
               new Promise<void>((resolve, reject) => {
                  const body: FieldsChangePassword = this.$formChangePassword().value();
                  let { method, route } = this.routes.changePassword;

                  this.$loading.set(true);
                  firstValueFrom(this._http.request(method, `${environment.apiUrl}${route}`, { body }))
                     .then(() => {
                        this.resetForm({ form: 'changePassword' });
                        this._dialogs.closeDialogs();
                        resolve();
                     })
                     .catch(reject)
                     .finally(() => this.$loading.set(false));
               }),
         ).then((state: boolean) => {
            if (state) return;

            this._dialogs.alert({
               severity: 'error',
               title: FORMS_I18N_KEYS.ERROR_TITLE,
               text: FORMS_I18N_KEYS.VAL_COMPLETE_CORRECTLY,
            });
         }),
      );
   }

   /**
    *
    */
   public logout(): void {
      const { method, route } = this.routes.logout;

      this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_LOGOUT }).then(() => {
         this.$loading.set(true);
         firstValueFrom(this._http.request(method, `${environment.apiUrl}${route}`))
            .then(() => this._session.clear())
            .finally(() => this.$loading.set(false));
      });
   }
}
