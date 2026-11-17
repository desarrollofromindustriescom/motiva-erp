import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { UserRow, UsersPage } from '../../../interfaces/user';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { LOAN_BORROWERS_PAGE_SIZE, LOAN_BORROWERS_SEARCH_DELAY } from '../repository/loans.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Borrowers of the loans filter: the first ones or the ones that match what the user
 * types (searched on the server so there is no need to bring all of them). Every
 * borrower received is remembered so the selected ones keep their name when the list changes.
 */
@Injectable({ providedIn: 'root' })
export class LoanBorrowersService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.LISTUSERS, method: HTTP_METHODS.QUERY };

   private readonly $options: WritableSignal<UserRow[]> = signal([]);
   private readonly $searching: WritableSignal<boolean> = signal(false);
   private readonly known: Map<string, UserRow> = new Map();
   private timer: ReturnType<typeof setTimeout> | undefined;
   private version: number = 0;

   public get options(): UserRow[] {
      return this.$options();
   }

   public get searching(): boolean {
      return this.$searching();
   }

   /**
    * Borrowers already seen with these ids (the ones the user selected)
    */
   public byIds({ ids }: { ids: string[] }): UserRow[] {
      return ids.map((id: string) => this.known.get(id)).filter((user): user is UserRow => !!user);
   }

   /**
    * Looks for borrowers while the user types, waiting until it stops
    */
   public search({ search }: { search: string }): void {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.load({ search: search.trim() }), LOAN_BORROWERS_SEARCH_DELAY);
   }

   public async load({ search }: { search: string }): Promise<void> {
      if (!this._session.token) return;

      const version: number = ++this.version;
      const { route, method } = this.route;
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);
      const body: Record<string, string | number> = {
         page: 1,
         size: LOAN_BORROWERS_PAGE_SIZE,
         profile: 'borrower',
      };

      if (search) body['search'] = search;

      this.$searching.set(true);

      try {
         const page: UsersPage = await firstValueFrom(
            this._http.request<UsersPage>(method, `${environment.apiUrl}${route}`, { body, context }),
         );

         // a slower previous search can't replace a newer one
         if (version !== this.version) return;

         for (const user of page.items) this.known.set(user.id, user);

         this.$options.set(page.items);
      } catch {
         // the error interceptor already notifies the user
      } finally {
         if (version === this.version) this.$searching.set(false);
      }
   }
}
