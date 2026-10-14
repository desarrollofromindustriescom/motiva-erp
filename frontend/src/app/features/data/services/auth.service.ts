import { effect, inject, Injectable, signal, untracked, WritableSignal } from '@angular/core';
import { AuthForms, AuthRoutes, FieldsLogin } from '../../../interfaces/auth';
import { HttpClient, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { EndpointData } from '../../../interfaces/api';
import { environment } from '../../../../environments/environment.development';
import { apiHeaders } from '../repository/custom-headers';
import { User } from '../../../interfaces/user';
import { ChildFieldContext, disabled, form, required, submit } from '@angular/forms/signals';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
   private readonly _router: Router = inject(Router);
   private readonly _translate: TranslateService = inject(TranslateService);
   private readonly _http: HttpClient = inject(HttpClient);

   private readonly routes: Record<AuthRoutes, EndpointData> = {
      verifyToken: { route: '/verify', method: 'GET' },
      login: { route: '/login', method: 'POST' },
   };

   private readonly $loading: WritableSignal<boolean> = signal(false);
   private readonly $token: WritableSignal<string> = signal('');
   private readonly $user: HttpResourceRef<User | null> = httpResource(
      (): HttpResourceRequest | undefined => {
         const token: string = this.$token();

         if (!token) return undefined;

         const { route, method } = this.routes.verifyToken;
         const { ignoreError } = apiHeaders;
         const url: string = `${environment.apiUrl}${route}`;
         const headers: Record<string, string> = { [ignoreError]: '' };

         return { url, method, headers };
      },
      {
         defaultValue: null,
      },
   );

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
      effect(() => {
         const loading: boolean = this.$user.isLoading();
         untracked(() => this.$loading.set(loading));
      });
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get token(): string {
      return this.$token();
   }

   public get user(): User | null {
      return this.$user.value();
   }

   public get forms(): AuthForms {
      return {
         login: this.$formLogin,
      };
   }

   public init(): void {
      this.$loading.set(true);
      cookieStore
         .get(environment.tokenKey)
         .then((item: CookieListItem | null) => {
            if (item && item.value) this.$token.set(item.value);
         })
         .finally(() => this.$loading.set(false));
   }

   public login(): void {
      submit(this.$formLogin, async () => {
         const body: FieldsLogin = this.$formLogin().value();
         const { method, route } = this.routes.login;

         this.$loading.set(true);
         firstValueFrom(this._http.request(method, `${environment.apiUrl}${route}`, { body }))
            .then((response: any) => console.log(response))
            .catch((err) => console.error(err))
            .finally(() => this.$loading.set(false));
      }).then((state: boolean) => {
         !state &&
            Swal.fire({
               title: this._translate.instant('FORM_ERROR_TITLE'),
               text: this._translate.instant('FORM_ALL_FIELDS_REQUIRED'),
               icon: 'error',
               timer: 3000,
            });
      });
   }

   public logout(): void {
      this._router.navigate(['/']);
      this.$token.set('');
   }
}
