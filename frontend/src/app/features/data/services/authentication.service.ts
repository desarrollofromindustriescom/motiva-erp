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

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
   private readonly _session: SessionService = inject(SessionService);
   private readonly _translate: TranslateService = inject(TranslateService);
   private readonly _http: HttpClient = inject(HttpClient);

   private readonly routes: Record<AuthenticationRoutes, EndpointData> = {
      validate: { route: '/validate', method: 'GET' },
      login: { route: '/login', method: 'POST' },
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
      required(schema.username, {
         message: 'FIELD_VALIDATION_REQUIRED',
         when: ({ state }: ChildFieldContext<string>) => state.touched(),
      });
      required(schema.password, {
         message: 'FIELD_VALIDATION_REQUIRED',
         when: ({ state }: ChildFieldContext<string>) => state.touched(),
      });

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
   public validate(): Promise<void> {
      let { method, route } = this.routes.validate;

      this.$loading.set(true);
      return firstValueFrom(this._http.request<Session>(method, `${environment.apiUrl}${route}`))
         .then((session: Session) => {
            console.log('session', session);
            this._session.session = session;
         })
         .finally(() => this.$loading.set(false));
   }

   /**
    *
    */
   public login(): void {
      submit(this.$formLogin, async () => {
         const body: FieldsLogin = this.$formLogin().value();
         let { method, route } = this.routes.login;

         this.$loading.set(true);
         return firstValueFrom(this._http.request<LoginPreview>(method, `${environment.apiUrl}${route}`, { body }))
            .then(({ token }: LoginPreview) => {
               this._session.token = token;
               return this.validate();
            })
            .finally(() => this.$loading.set(false));
      }).then((state: boolean) => {
         if (state) return;

         Swal.fire({
            title: this._translate.instant('FORM_ERROR_TITLE'),
            text: this._translate.instant('FORM_ALL_FIELDS_REQUIRED'),
            icon: 'error',
            timer: 3000,
         });
      });
   }
}
