import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { Kpis } from '../../../interfaces/kpis';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Kpis of the dashboard (money lent, what is waiting to be paid, investors, borrowers & the loans of the last
 * weeks). The api calculates & stores them, here they are only read & read again with `enter()`.
 */
@Injectable({ providedIn: 'root' })
export class KpisService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.KPIS, method: HTTP_METHODS.GET };

   private readonly $active: WritableSignal<boolean> = signal(false);
   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $kpis: HttpResourceRef<Kpis | undefined> = httpResource<Kpis>(
      (): HttpResourceRequest | undefined => {
         if (!this.$active() || !this._session.token) return undefined;

         // a new version means a new request even when nothing else changed
         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$kpis.isLoading());

   public get loading(): boolean {
      return this.$loading();
   }

   // the values stay while they are read again, so the panel doesn't blink
   public get kpis(): Kpis | undefined {
      return this.$kpis.hasValue() ? this.$kpis.value() : undefined;
   }

   public get failed(): boolean {
      return this.$kpis.error() !== undefined && !this.$kpis.hasValue();
   }

   /**
    * Reads the kpis (again): called when the panel is entered & while it stays open
    */
   public enter(): void {
      this.$active.set(true);
      this.$version.update((version: number) => version + 1);
   }
}
