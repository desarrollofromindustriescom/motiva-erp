import { computed, inject, Injectable, Signal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { CashBalance, CashBalanceLoader, CashBalanceRoutes } from '../../../interfaces/cash-balance';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class CashBalanceService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly routes: Record<CashBalanceRoutes, EndpointData> = {
      cashBalance: { route: API_ROUTES.CASHBALANCE, method: HTTP_METHODS.GET },
   };

   private readonly $balance: HttpResourceRef<CashBalance | undefined> = httpResource<CashBalance>(
      (): HttpResourceRequest | undefined => {
         if (!this._session.token) return undefined;

         const { route, method } = this.routes.cashBalance;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, context };
      },
   );

   private readonly $loader: Signal<CashBalanceLoader> = computed(() => ({
      balance: this.$balance.isLoading(),
   }));

   constructor() {}

   public get loader(): CashBalanceLoader {
      return this.$loader();
   }

   public get balance(): CashBalance | undefined {
      return this.$balance.hasValue() ? this.$balance.value() : undefined;
   }

   /**
    * Fetch the balance again (only used when entering the module)
    */
   public reload(): void {
      this.$balance.reload();
   }
}
