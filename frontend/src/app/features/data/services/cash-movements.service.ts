import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { CashBalanceRoutes, Movement, MovementsPage, MovementsQuery } from '../../../interfaces/cash-balance';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { MOVEMENTS_PAGE_SIZE } from '../repository/cash-balance.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Movements of the general cash balance. Data is only requested after
 * `open()` is called (when the movements dialog is opened) and it's kept
 * while the user goes to the detail dialog & comes back.
 */
@Injectable({ providedIn: 'root' })
export class CashMovementsService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly routes: Pick<Record<CashBalanceRoutes, EndpointData>, 'movements'> = {
      movements: { route: API_ROUTES.MOVEMENTS, method: HTTP_METHODS.QUERY },
   };

   private readonly $active: WritableSignal<boolean> = signal(false);
   private readonly $version: WritableSignal<number> = signal(0);
   private readonly $page: WritableSignal<number> = signal(1);
   private readonly $selected: WritableSignal<Movement | null> = signal(null);

   private readonly $movements: HttpResourceRef<MovementsPage | undefined> = httpResource<MovementsPage>(
      (): HttpResourceRequest | undefined => {
         if (!this.$active() || !this._session.token) return undefined;

         // a new version means a new request even when the page didn't change
         this.$version();

         const { route, method } = this.routes.movements;
         const body: MovementsQuery = { page: this.$page(), size: MOVEMENTS_PAGE_SIZE };
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, body, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$movements.isLoading());

   constructor() {}

   public get loading(): boolean {
      return this.$loading();
   }

   public get movements(): Movement[] {
      return this.$movements.hasValue() ? (this.$movements.value()?.items ?? []) : [];
   }

   public get total(): number {
      return this.$movements.hasValue() ? (this.$movements.value()?.total ?? 0) : 0;
   }

   public get page(): number {
      return this.$page();
   }

   public get size(): number {
      return MOVEMENTS_PAGE_SIZE;
   }

   public get selected(): Movement | null {
      return this.$selected();
   }

   public set selected(value: Movement | null) {
      this.$selected.set(value);
   }

   /**
    * Starts a fresh query from the first page
    */
   public open(): void {
      this.$page.set(1);
      this.$active.set(true);
      this.$version.update((version: number) => version + 1);
   }

   /**
    *
    */
   public changePage({ page }: { page: number }): void {
      this.$page.set(page);
   }
}
