import { computed, effect, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { LoanDeposit, LoanDepositsPage } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { LOAN_DEPOSITS_PAGE_SIZE, loansRoute } from '../repository/loans.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Payments made to one payment of a loan, paginated, with the sum of all of them.
 * Data is only requested after `open()`, which starts again from the first page.
 */
@Injectable({ providedIn: 'root' })
export class LoanPaymentDepositsService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.LOANDEPOSITS, method: HTTP_METHODS.QUERY };

   private readonly $loanId: WritableSignal<string | null> = signal(null);
   private readonly $paymentId: WritableSignal<string | null> = signal(null);
   private readonly $page: WritableSignal<number> = signal(1);
   private readonly $version: WritableSignal<number> = signal(0);
   // last page received, so the table keeps its rows & paginator while the next page loads
   private readonly $last: WritableSignal<LoanDepositsPage | undefined> = signal(undefined);

   private readonly $deposits: HttpResourceRef<LoanDepositsPage | undefined> = httpResource<LoanDepositsPage>(
      (): HttpResourceRequest | undefined => {
         const loanId: string | null = this.$loanId();
         const paymentId: string | null = this.$paymentId();

         if (!loanId || !paymentId || !this._session.token) return undefined;

         // a new version means a new request even for the same payment
         this.$version();

         const { method } = this.route;
         const route: string = loansRoute({ route: this.route.route, profile: this._session.session?.profile });
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return {
            url: `${environment.apiUrl}${route}${loanId}/payments/${paymentId}/deposits`,
            method,
            body: { page: this.$page(), size: LOAN_DEPOSITS_PAGE_SIZE },
            context,
         };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$deposits.isLoading());

   constructor() {
      effect(() => {
         if (this.$deposits.hasValue()) this.$last.set(this.$deposits.value());
      });
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get deposits(): LoanDeposit[] {
      return this.$last()?.items ?? [];
   }

   public get total(): number {
      return this.$last()?.total ?? 0;
   }

   public get sum(): number {
      return this.$last()?.sum ?? 0;
   }

   public get page(): number {
      return this.$page();
   }

   public get size(): number {
      return LOAN_DEPOSITS_PAGE_SIZE;
   }

   // false until the first page arrives
   public get ready(): boolean {
      return this.$last() !== undefined;
   }

   public open({ loanId, paymentId }: { loanId: string; paymentId: string }): void {
      this.$last.set(undefined);
      this.$loanId.set(loanId);
      this.$paymentId.set(paymentId);
      this.$page.set(1);
      this.$version.update((version: number) => version + 1);
   }

   public changePage({ page }: { page: number }): void {
      this.$page.set(page);
   }
}
