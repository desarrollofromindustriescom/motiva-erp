import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { BorrowerSummary } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Panel of the borrower that is logged in: what it owes, the payments it has left, its active loans
 * & its next payment. It's only requested for borrowers & again every time the panel is entered.
 */
@Injectable({ providedIn: 'root' })
export class BorrowerPanelService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.MYSUMMARY, method: HTTP_METHODS.GET };

   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $summary: HttpResourceRef<BorrowerSummary | undefined> = httpResource<BorrowerSummary>(
      (): HttpResourceRequest | undefined => {
         if (!this._session.token || this._session.session?.profile !== 'borrower') return undefined;

         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$summary.isLoading());

   public get loading(): boolean {
      return this.$loading();
   }

   public get summary(): BorrowerSummary | undefined {
      return this.$summary.hasValue() ? this.$summary.value() : undefined;
   }

   /**
    * Asks for the summary again (called when the panel is entered)
    */
   public enter(): void {
      this.$version.update((version: number) => version + 1);
   }
}
