import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { UserDetail } from '../../../interfaces/user';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Every stored field of the user shown in the detail dialog. Data is only
 * requested after `open()` and it's requested again every time it's called.
 */
@Injectable({ providedIn: 'root' })
export class UserDetailService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.GETUSER, method: HTTP_METHODS.GET };

   private readonly $id: WritableSignal<string | null> = signal(null);
   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $user: HttpResourceRef<UserDetail | undefined> = httpResource<UserDetail>(
      (): HttpResourceRequest | undefined => {
         const id: string | null = this.$id();

         if (!id || !this._session.token) return undefined;

         // a new version means a new request even for the same user
         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}${id}`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$user.isLoading());

   constructor() {}

   public get loading(): boolean {
      return this.$loading();
   }

   public get detail(): UserDetail | undefined {
      return this.$user.hasValue() ? this.$user.value() : undefined;
   }

   public get failed(): boolean {
      return this.$user.error() !== undefined;
   }

   public open({ id }: { id: string }): void {
      this.$id.set(id);
      this.$version.update((version: number) => version + 1);
   }
}
