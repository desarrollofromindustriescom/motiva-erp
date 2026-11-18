import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { LoanPayment } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Payments of the loan shown in the payments dialog. Data is only
 * requested after `open()` and it's requested again every time it's called.
 */
@Injectable({ providedIn: 'root' })
export class LoanPaymentsService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.LOANPAYMENTS, method: HTTP_METHODS.GET };

   private readonly $id: WritableSignal<string | null> = signal(null);
   private readonly $folio: WritableSignal<string> = signal('');
   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $payments: HttpResourceRef<LoanPayment[] | undefined> = httpResource<LoanPayment[]>(
      (): HttpResourceRequest | undefined => {
         const id: string | null = this.$id();

         if (!id || !this._session.token) return undefined;

         // a new version means a new request even for the same loan
         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}${id}/payments`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$payments.isLoading());

   // folio of the loan whose payments are shown (already compact)
   public get folio(): string {
      return this.$folio();
   }

   // loan whose payments are shown
   public get id(): string | null {
      return this.$id();
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get payments(): LoanPayment[] | undefined {
      return this.$payments.hasValue() ? this.$payments.value() : undefined;
   }

   /**
    * Requests the payments again (ex: after paying one)
    */
   public reload(): void {
      this.$version.update((version: number) => version + 1);
   }

   /**
    * Requests the payments again only when they are the ones of this loan
    */
   public reloadFor({ id }: { id: string }): void {
      if (this.$id() === id) this.reload();
   }

   public open({ id, folio }: { id: string; folio: string }): void {
      this.$folio.set(folio);
      // the payments of the previous loan aren't shown while the new ones load
      this.$id.set(null);
      this.$id.set(id);
      this.$version.update((version: number) => version + 1);
   }
}
