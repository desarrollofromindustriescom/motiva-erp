import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { LoanDetail } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Every data of the loan shown in the detail dialog. Data is only
 * requested after `open()` and it's requested again every time it's called.
 */
@Injectable({ providedIn: 'root' })
export class LoanDetailService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.GETLOAN, method: HTTP_METHODS.GET };

   private readonly $id: WritableSignal<string | null> = signal(null);
   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $loan: HttpResourceRef<LoanDetail | undefined> = httpResource<LoanDetail>(
      (): HttpResourceRequest | undefined => {
         const id: string | null = this.$id();

         if (!id || !this._session.token) return undefined;

         // a new version means a new request even for the same loan
         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}${id}`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$loan.isLoading());

   public get loading(): boolean {
      return this.$loading();
   }

   public get detail(): LoanDetail | undefined {
      return this.$loan.hasValue() ? this.$loan.value() : undefined;
   }

   public get failed(): boolean {
      return this.$loan.error() !== undefined;
   }

   public open({ id }: { id: string }): void {
      // the previous loan isn't shown while the new one loads
      this.$id.set(null);
      this.$id.set(id);
      this.$version.update((version: number) => version + 1);
   }
}
