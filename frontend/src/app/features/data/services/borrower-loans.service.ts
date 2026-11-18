import { computed, effect, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { LoanRow, LoansOrder, LoansPage } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { LOANS_PAGE_SIZE } from '../repository/loans.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Loans of the borrower that is logged in (its panel): paginated & ordered by folio. Data is only
 * requested for borrowers, after `enter()`, which starts again from the first page.
 */
@Injectable({ providedIn: 'root' })
export class BorrowerLoansService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.MYLOANS, method: HTTP_METHODS.QUERY };

   private readonly $active: WritableSignal<boolean> = signal(false);
   private readonly $version: WritableSignal<number> = signal(0);
   private readonly $page: WritableSignal<number> = signal(1);
   private readonly $order: WritableSignal<LoansOrder> = signal('');
   // last page received, so the table keeps its rows & paginator while the next page loads
   private readonly $last: WritableSignal<LoansPage | undefined> = signal(undefined);

   private readonly $loans: HttpResourceRef<LoansPage | undefined> = httpResource<LoansPage>(
      (): HttpResourceRequest | undefined => {
         if (!this.$active() || !this._session.token || this._session.session?.profile !== 'borrower') {
            return undefined;
         }

         // a new version means a new request even when nothing else changed
         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);
         const body = { page: this.$page(), size: LOANS_PAGE_SIZE, order: this.$order() };

         return { url: `${environment.apiUrl}${route}`, method, body, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$loans.isLoading());

   constructor() {
      effect(() => {
         if (this.$loans.hasValue()) this.$last.set(this.$loans.value());
      });
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get loans(): LoanRow[] {
      return this.$last()?.items ?? [];
   }

   public get total(): number {
      return this.$last()?.total ?? 0;
   }

   public get page(): number {
      return this.$page();
   }

   public get size(): number {
      return LOANS_PAGE_SIZE;
   }

   public get order(): LoansOrder {
      return this.$order();
   }

   /**
    * Starts a fresh query: first page & default order
    */
   public enter(): void {
      this.$last.set(undefined);
      this.$page.set(1);
      this.$order.set('');
      this.$active.set(true);
      this.$version.update((version: number) => version + 1);
   }

   public changePage({ page }: { page: number }): void {
      this.$page.set(page);
   }

   /**
    * Order by folio: none -> ascending -> descending -> none
    */
   public toggleOrder(): void {
      const next: Record<LoansOrder, LoansOrder> = { '': 'asc', 'asc': 'desc', 'desc': '' };

      this.$order.update((current: LoansOrder) => next[current]);
      this.$page.set(1);
   }
}
