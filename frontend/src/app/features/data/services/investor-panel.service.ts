import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { InvestorBalance } from '../../../interfaces/cash-balance';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Own balance of the investor that is logged in (its panel). It's only requested
 * for investors & again every time the panel is entered, so the balance is fresh.
 */
@Injectable({ providedIn: 'root' })
export class InvestorPanelService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.MYBALANCE, method: HTTP_METHODS.GET };

   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $balance: HttpResourceRef<InvestorBalance | undefined> = httpResource<InvestorBalance>(
      (): HttpResourceRequest | undefined => {
         if (!this._session.token || this._session.session?.profile !== 'investor') return undefined;

         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$balance.isLoading());

   constructor() {}

   public get loading(): boolean {
      return this.$loading();
   }

   public get balance(): InvestorBalance | undefined {
      return this.$balance.hasValue() ? this.$balance.value() : undefined;
   }

   /**
    * Asks for the balance again (called when the panel is entered)
    */
   public enter(): void {
      this.$version.update((version: number) => version + 1);
   }
}
