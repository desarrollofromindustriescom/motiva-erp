import { computed, effect, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { LoanRow, LoansFilters, LoansOrder, LoansPage } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { LOANS_PAGE_SIZE } from '../repository/loans.repository';
import { SIDEBAR_LOAN_FIELDS as FIELD } from '../repository/sidebar.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

type Body = Record<string, unknown>;

const list = (value: string): string[] => (value ? value.split(',').filter((item: string) => item !== '') : []);
const numbers = (value: string): number[] => list(value).map(Number);

/**
 * "min,max" -> the keys of the body that have a value ("min" alone, ",max" alone or both)
 */
function range({ body, value, min, max }: { body: Body; value: string; min: string; max: string }): void {
   const [from, to] = value.split(',');

   if (from) body[min] = Number(from);
   if (to) body[max] = Number(to);
}

/**
 * Loans table: data is only requested after `enter()` (when the loans page
 * opens). Filters, order & page live here so they are kept while the user
 * changes the page, and they start empty every time the page is entered.
 */
@Injectable({ providedIn: 'root' })
export class LoansListService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.LISTLOANS, method: HTTP_METHODS.QUERY };

   private readonly $active: WritableSignal<boolean> = signal(false);
   private readonly $version: WritableSignal<number> = signal(0);
   private readonly $page: WritableSignal<number> = signal(1);
   private readonly $order: WritableSignal<LoansOrder> = signal('');
   private readonly $filters: WritableSignal<LoansFilters> = signal({});
   // last page received, so the table keeps its rows & paginator while the next page loads
   private readonly $last: WritableSignal<LoansPage | undefined> = signal(undefined);

   private readonly $loans: HttpResourceRef<LoansPage | undefined> = httpResource<LoansPage>(
      (): HttpResourceRequest | undefined => {
         if (!this.$active() || !this._session.token) return undefined;

         // a new version means a new request even when nothing else changed
         this.$version();

         const { route, method } = this.route;
         const body: Body = { page: this.$page(), size: LOANS_PAGE_SIZE, order: this.$order() };
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         Object.assign(body, this.query({ filters: this.$filters() }));

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
    * Starts a fresh query: first page, no filters & default order
    */
   public enter(): void {
      this.$last.set(undefined);
      this.$page.set(1);
      this.$order.set('');
      this.$filters.set({});
      this.$active.set(true);
      this.$version.update((version: number) => version + 1);
   }

   /**
    * Sets the filters (the ones missing are removed) & goes back to the first page
    */
   public applyFilters({ values }: { values: LoansFilters }): void {
      this.$filters.set({ ...values });
      this.$page.set(1);
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

   /**
    * Requests the current query again (ex: after creating a loan)
    */
   public reload(): void {
      if (this.$active()) this.$version.update((version: number) => version + 1);
   }

   /**
    * Fields of the request for the filters, only the ones with a value
    */
   private query({ filters }: { filters: LoansFilters }): Body {
      const body: Body = {};
      const value = (field: string): string => filters[field] ?? '';

      if (value(FIELD.SEARCH)) body['search'] = value(FIELD.SEARCH);
      if (value(FIELD.BORROWERS)) body['borrowers'] = list(value(FIELD.BORROWERS));

      const [issueFrom, issueTo] = value(FIELD.ISSUE).split(',');
      const [settleFrom, settleTo] = value(FIELD.SETTLE).split(',');

      if (issueFrom) body['issue_from'] = issueFrom;
      if (issueTo) body['issue_to'] = issueTo;
      if (settleFrom) body['settle_from'] = settleFrom;
      if (settleTo) body['settle_to'] = settleTo;

      range({ body, value: value(FIELD.RATE), min: 'rate_min', max: 'rate_max' });
      range({ body, value: value(FIELD.PAYMENTS_RANGE), min: 'payments_min', max: 'payments_max' });
      range({ body, value: value(FIELD.AMOUNT), min: 'amount_min', max: 'amount_max' });
      range({ body, value: value(FIELD.TOTAL), min: 'total_min', max: 'total_max' });

      if (value(FIELD.WEEKLY_DAYS)) body['weekly_days'] = numbers(value(FIELD.WEEKLY_DAYS));
      if (value(FIELD.MONTHLY_DAYS)) body['monthly_days'] = numbers(value(FIELD.MONTHLY_DAYS));
      if (value(FIELD.WITH_VISITS) === 'true') body['with_visits'] = true;
      if (value(FIELD.WITH_MORA) === 'true') body['with_mora'] = true;
      if (value(FIELD.TYPE)) body['type'] = value(FIELD.TYPE);
      if (value(FIELD.PAYMENTS)) body['payments'] = numbers(value(FIELD.PAYMENTS));
      if (value(FIELD.STATUSES)) body['statuses'] = list(value(FIELD.STATUSES));

      return body;
   }
}
