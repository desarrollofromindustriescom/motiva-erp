import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import {
   AuthenticationForms,
   AuthenticationRoutes,
   FieldsLogin,
   LoginPreview,
} from '../../../interfaces/authentication';
import { HttpClient } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { environment } from '../../../../environments/environment.development';
import { ChildFieldContext, disabled, form, required, submit } from '@angular/forms/signals';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { firstValueFrom } from 'rxjs';
import { SessionService } from './session.service';
import { Session } from '../../../interfaces/session';
import { CUSTOM_HEADERS } from '../repository/custom-headers';
import { Router } from '@angular/router';
import { API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { PATHS } from '../repository/navigation.repository';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
   private readonly _router: Router = inject(Router);
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _translate: TranslateService = inject(TranslateService);

   private readonly routes: Record<AuthenticationRoutes, EndpointData> = {
      validate: { route: API_ROUTES.VALIDATE, method: HTTP_METHODS.GET },
      login: { route: API_ROUTES.LOGIN, method: HTTP_METHODS.POST },
   };

   private readonly $loading: WritableSignal<boolean> = signal(false);
   // private readonly $token: WritableSignal<string> = signal('');
   // private readonly $user: HttpResourceRef<User | null> = httpResource(
   //    (): HttpResourceRequest | undefined => {
   //       const token: string = this.$token();

   //       if (!token) return undefined;

   //       const { route, method } = this.routes.verifyToken;
   //       const { ignoreError } = apiHeaders;
   //       const url: string = `${environment.apiUrl}${route}`;
   //       const headers: Record<string, string> = { [ignoreError]: '' };

   //       return { url, method, headers };
   //    },
   //    {
   //       defaultValue: null,
   //    },
   // );

   private readonly $modelLogin: WritableSignal<FieldsLogin> = signal({
      username: '',
      password: '',
   });

   private readonly $formLogin: SignalForm<FieldsLogin> = form(this.$modelLogin, (schema: FormSchema<FieldsLogin>) => {
      required(schema.username, { when: ({ state }: ChildFieldContext<string>) => state.touched() });
      required(schema.password, { when: ({ state }: ChildFieldContext<string>) => state.touched() });

      disabled(schema.username, { when: () => this.$loading() });
      disabled(schema.password, { when: () => this.$loading() });
   });

   constructor() {
      // effect(() => {
      //    const loading: boolean = this.$user.isLoading();
      //    untracked(() => this.$loading.set(loading));
      // });
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get forms(): AuthenticationForms {
      return {
         login: this.$formLogin,
      };
   }

   /**
    *
    */
   public validate(options?: { hideError?: boolean }): Promise<void> {
      return new Promise((resolve, reject) => {
         if (!this._session.token) return resolve();

         const headers: Record<string, string> = {};
         let { method, route } = this.routes.validate;

         if (options && options.hideError) headers[CUSTOM_HEADERS.IGNORE_ERROR] = '';

         this.$loading.set(true);
         firstValueFrom(this._http.request<Session>(method, `${environment.apiUrl}${route}`, { headers }))
            .then((session: Session) => {
               this._session.session = session;
               resolve();
            })
            .catch(reject)
            .finally(() => this.$loading.set(false));
      });
   }

   /**
    *
    */
   public login(): void {
      submit(
         this.$formLogin,
         async () =>
            new Promise<void>((resolve, reject) => {
               const body: FieldsLogin = this.$formLogin().value();
               let { method, route } = this.routes.login;

               this.$loading.set(true);
               firstValueFrom(this._http.request<LoginPreview>(method, `${environment.apiUrl}${route}`, { body }))
                  .then(({ token }: LoginPreview) => {
                     this.$formLogin().reset(this.$modelLogin());
                     this._session.updateToken({ token, store: true });
                     return this.validate();
                  })
                  .then(() => {
                     this._router.navigate([PATHS.ROOT, PATHS.APP]);
                     resolve();
                  })
                  .catch(reject)
                  .finally(() => this.$loading.set(false));
            }),
      ).then((state: boolean) => {
         if (state) return;

         Swal.fire({
            title: this._translate.instant(FORMS_I18N_KEYS.ERROR_TITLE),
            text: this._translate.instant(FORMS_I18N_KEYS.VAL_ALL_FIELDS_REQUIRED),
            icon: 'error',
            timer: 3000,
         });
      });
   }

   /**
    *
    */
   public recoverSession(options?: { hideError?: boolean }): Promise<void> {
      return new Promise((resolve, reject) => {
         const token: string = this._session.token;
         const session: Session | null = this._session.session;

         if (token && session) return resolve();

         let handler: () => Promise<void> = () => Promise.resolve();

         if (!token) handler = () => this._session.getTokenCookie();

         handler()
            .then(() => this.validate(options))
            .then(resolve)
            .catch(reject);
      });
   }
}
