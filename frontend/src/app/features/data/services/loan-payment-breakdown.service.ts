import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { LoanBreakdown } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * What a payment of a loan is made of (original amount, mora & visits). Data is only
 * requested after `open()` and it's requested again every time it's called.
 */
@Injectable({ providedIn: 'root' })
export class LoanPaymentBreakdownService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.LOANBREAKDOWN, method: HTTP_METHODS.GET };

   private readonly $loanId: WritableSignal<string | null> = signal(null);
   private readonly $paymentId: WritableSignal<string | null> = signal(null);
   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $breakdown: HttpResourceRef<LoanBreakdown | undefined> = httpResource<LoanBreakdown>(
      (): HttpResourceRequest | undefined => {
         const loanId: string | null = this.$loanId();
         const paymentId: string | null = this.$paymentId();

         if (!loanId || !paymentId || !this._session.token) return undefined;

         // a new version means a new request even for the same payment
         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}${loanId}/payments/${paymentId}/breakdown`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$breakdown.isLoading());

   public get loading(): boolean {
      return this.$loading();
   }

   public get breakdown(): LoanBreakdown | undefined {
      return this.$breakdown.hasValue() ? this.$breakdown.value() : undefined;
   }

   public open({ loanId, paymentId }: { loanId: string; paymentId: string }): void {
      // the breakdown of the previous payment isn't shown while the new one loads
      this.$loanId.set(null);
      this.$loanId.set(loanId);
      this.$paymentId.set(paymentId);
      this.$version.update((version: number) => version + 1);
   }
}
