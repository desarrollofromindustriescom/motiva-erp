import { computed, effect, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { UserRow, UsersFilters, UsersOrder, UsersPage, UsersQuery } from '../../../interfaces/user';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { USERS_PAGE_SIZE } from '../repository/users.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

const NO_FILTERS: UsersFilters = { search: '', profile: '', status: '' };

/**
 * Users table: data is only requested after `enter()` (when the users page
 * opens). Filters, order & page live here so they are kept while the user
 * changes the page, and they start empty every time the page is entered.
 */
@Injectable({ providedIn: 'root' })
export class UsersListService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.LISTUSERS, method: HTTP_METHODS.QUERY };

   private readonly $active: WritableSignal<boolean> = signal(false);
   private readonly $version: WritableSignal<number> = signal(0);
   private readonly $page: WritableSignal<number> = signal(1);
   private readonly $order: WritableSignal<UsersOrder> = signal('');
   private readonly $filters: WritableSignal<UsersFilters> = signal({ ...NO_FILTERS });
   // last page received, so the table keeps its rows & paginator while the next page loads
   private readonly $last: WritableSignal<UsersPage | undefined> = signal(undefined);

   private readonly $users: HttpResourceRef<UsersPage | undefined> = httpResource<UsersPage>(
      (): HttpResourceRequest | undefined => {
         if (!this.$active() || !this._session.token) return undefined;

         // a new version means a new request even when nothing else changed
         this.$version();

         const { route, method } = this.route;
         const filters: UsersFilters = this.$filters();
         const body: UsersQuery = { page: this.$page(), size: USERS_PAGE_SIZE, order: this.$order() };
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         if (filters.search) body.search = filters.search;
         if (filters.profile) body.profile = filters.profile;
         if (filters.status) body.status = filters.status;

         return { url: `${environment.apiUrl}${route}`, method, body, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$users.isLoading());

   constructor() {
      effect(() => {
         if (this.$users.hasValue()) this.$last.set(this.$users.value());
      });
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get users(): UserRow[] {
      return this.$last()?.items ?? [];
   }

   public get total(): number {
      return this.$last()?.total ?? 0;
   }

   public get page(): number {
      return this.$page();
   }

   public get size(): number {
      return USERS_PAGE_SIZE;
   }

   public get order(): UsersOrder {
      return this.$order();
   }

   /**
    * Starts a fresh query: first page, no filters & default order
    */
   public enter(): void {
      this.$last.set(undefined);
      this.$page.set(1);
      this.$order.set('');
      this.$filters.set({ ...NO_FILTERS });
      this.$active.set(true);
      this.$version.update((version: number) => version + 1);
   }

   /**
    * Sets the filters (the ones missing are removed) & goes back to the first page
    */
   public applyFilters({ values }: { values: Record<string, string> }): void {
      this.$filters.set({
         search: values['search'] ?? '',
         profile: values['profile'] ?? '',
         status: values['status'] ?? '',
      });
      this.$page.set(1);
   }

   public changePage({ page }: { page: number }): void {
      this.$page.set(page);
   }

   /**
    * Order by CURP: none -> ascending -> descending -> none
    */
   public toggleOrder(): void {
      const next: Record<UsersOrder, UsersOrder> = { '': 'asc', 'asc': 'desc', 'desc': '' };

      this.$order.update((current: UsersOrder) => next[current]);
      this.$page.set(1);
   }

   /**
    * Requests the current query again (ex: after creating a user)
    */
   public reload(): void {
      if (this.$active()) this.$version.update((version: number) => version + 1);
   }

   /**
    * Requests the query again after removing a user: when it was the
    * only row of the last page, goes back one page so it doesn't show empty
    */
   public reloadAfterRemoval(): void {
      if (this.$page() > 1 && this.users.length <= 1) this.$page.update((page: number) => page - 1);

      this.reload();
   }
}
