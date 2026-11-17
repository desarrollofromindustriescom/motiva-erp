import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { disabled, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import {
   FieldsLoan,
   Loan,
   LoanDetail,
   LoanFundChoice,
   LoanFunds,
   LoanInvestorFund,
   LoanQuote,
   LoanType,
} from '../../../interfaces/loan';
import { UserRow, UsersPage } from '../../../interfaces/user';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';
import {
   LOAN_BORROWERS_PAGE_SIZE,
   LOAN_BORROWERS_SEARCH_DELAY,
   LOAN_MAX_PAYMENTS,
} from '../repository/loans.repository';
import { environment } from '../../../../environments/environment.development';
import { monetaryRules } from '../../web/utilities/validators/numeric.validators';
import { DialogsService } from './dialogs.service';
import { LoansListService } from './loans-list.service';
import { SessionService } from './session.service';

const EMPTY_MODEL: FieldsLoan = { borrower_id: '', amount: null, type: '', no_payments: null };
const NOT_CHOSEN: LoanFundChoice = { checked: false, amount: null };

// the interest is stored with 3 decimals, same as the backend
const RATE_SCALE: number = 100_000;

const cents = (value: number | null): number => Math.round((value ?? 0) * 100);

/**
 * New loan dialog: the request (borrower, amount, type & number of payments), the
 * interest of those terms with what the loan will cost, and the places the money
 * comes from. Saving only registers the request (pending); approving also takes
 * the money of the places the user checked.
 */
@Injectable({ providedIn: 'root' })
export class LoanCreationService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _list: LoansListService = inject(LoansListService);

   private readonly routes: Record<'users' | 'funds' | 'create' | 'detail', EndpointData> = {
      users: { route: API_ROUTES.LISTUSERS, method: HTTP_METHODS.QUERY },
      funds: { route: API_ROUTES.LOANFUNDS, method: HTTP_METHODS.QUERY },
      create: { route: API_ROUTES.CREATELOAN, method: HTTP_METHODS.POST },
      detail: { route: API_ROUTES.GETLOAN, method: HTTP_METHODS.GET },
   };

   private readonly $active: WritableSignal<boolean> = signal(false);
   // pending loan that is being continued, none when the loan is new
   private readonly $editId: WritableSignal<string | null> = signal(null);
   private readonly $saving: WritableSignal<boolean> = signal(false);
   private readonly $model: WritableSignal<FieldsLoan> = signal({ ...EMPTY_MODEL });

   // borrowers of the selector: the first ones or the ones that match the search
   private readonly $borrowers: WritableSignal<UserRow[]> = signal([]);
   private readonly $borrower: WritableSignal<UserRow | null> = signal(null);
   private readonly $searching: WritableSignal<boolean> = signal(false);
   private searchTimer: ReturnType<typeof setTimeout> | undefined;
   private searchVersion: number = 0;

   // what the user takes from the general cash balance & from each investor
   private readonly $general: WritableSignal<LoanFundChoice> = signal({ ...NOT_CHOSEN });
   private readonly $investors: WritableSignal<Record<string, LoanFundChoice>> = signal({});

   private readonly $form: SignalForm<FieldsLoan> = form(this.$model, (schema: FormSchema<FieldsLoan>) => {
      required(schema.borrower_id, { message: FORMS_I18N_KEYS.VAL_REQUIRED });
      monetaryRules(schema.amount);
      required(schema.type, { message: FORMS_I18N_KEYS.VAL_REQUIRED });
      required(schema.no_payments, { message: FORMS_I18N_KEYS.VAL_REQUIRED });

      disabled(schema.borrower_id, { when: () => this.$saving() });
      disabled(schema.amount, { when: () => this.$saving() });
      disabled(schema.type, { when: () => this.$saving() });
      disabled(schema.no_payments, { when: () => this.$saving() });
   });

   // interest & funds of the chosen terms, they are only requested once both are chosen
   private readonly $funds: HttpResourceRef<LoanFunds | undefined> = httpResource<LoanFunds>(
      (): HttpResourceRequest | undefined => {
         const { type, no_payments } = this.$model();

         if (!this.$active() || !this._session.token || !type || !no_payments) return undefined;

         const { route, method } = this.routes.funds;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, body: { type, no_payments }, context };
      },
   );

   private readonly $rate: Signal<number | null> = computed(() => {
      const { type, no_payments } = this.$model();

      return this.$funds.hasValue() && type && no_payments ? this.$funds.value().rate : null;
   });

   private readonly $quote: Signal<LoanQuote | null> = computed(() => {
      const rate: number | null = this.$rate();
      const { amount, no_payments } = this.$model();

      if (rate === null || !amount || !no_payments || amount <= 0) return null;

      // same integer math as the backend: the interest is applied once & split between the payments
      const raw: number = Math.round(rate * 1000);
      const total: number = Math.floor((cents(amount) * (RATE_SCALE + raw) + RATE_SCALE / 2) / RATE_SCALE);
      const payment: number = Math.floor((total + Math.floor(no_payments / 2)) / no_payments);

      return { total: total / 100, payment: payment / 100 };
   });

   // cents the checked places give, the places missing or unchecked give nothing
   private readonly $selected: Signal<number> = computed(() => {
      let total: number = this.$general().checked ? cents(this.$general().amount) : 0;

      for (const choice of Object.values(this.$investors())) total += choice.checked ? cents(choice.amount) : 0;

      return total;
   });

   private readonly $anyChecked: Signal<boolean> = computed(
      () => this.$general().checked || Object.values(this.$investors()).some((choice) => choice.checked),
   );

   // every checked place gives something it has & together they cover the amount exactly
   private readonly $fundsValid: Signal<boolean> = computed(() => {
      const funds: LoanFunds | undefined = this.$funds.hasValue() ? this.$funds.value() : undefined;
      const amount: number = cents(this.$model().amount);

      if (!funds || amount <= 0 || !this.$anyChecked() || this.$selected() !== amount) return false;

      const general: LoanFundChoice = this.$general();

      if (general.checked && (cents(general.amount) <= 0 || cents(general.amount) > cents(funds.general_available))) {
         return false;
      }

      return funds.investors.every((investor: LoanInvestorFund) => {
         const choice: LoanFundChoice = this.choiceOf({ id: investor.id });

         return !choice.checked || (cents(choice.amount) > 0 && cents(choice.amount) <= cents(investor.available));
      });
   });

   public get form(): SignalForm<FieldsLoan> {
      return this.$form;
   }

   public get saving(): boolean {
      return this.$saving();
   }

   public get borrowers(): UserRow[] {
      return this.$borrowers();
   }

   public get borrower(): UserRow | null {
      return this.$borrower();
   }

   public get searching(): boolean {
      return this.$searching();
   }

   public get funds(): LoanFunds | undefined {
      return this.$funds.hasValue() ? this.$funds.value() : undefined;
   }

   public get loadingFunds(): boolean {
      return this.$funds.isLoading();
   }

   public get rate(): number | null {
      return this.$rate();
   }

   public get quote(): LoanQuote | null {
      return this.$quote();
   }

   public get general(): LoanFundChoice {
      return this.$general();
   }

   /**
    * Amount (currency units) already covered by the checked places
    */
   public get selected(): number {
      return this.$selected() / 100;
   }

   /**
    * What is missing (positive) or what is too much (negative) to cover the amount of the loan
    */
   public get difference(): number {
      return (cents(this.$model().amount) - this.$selected()) / 100;
   }

   public get fundsValid(): boolean {
      return this.$fundsValid();
   }

   /**
    * Number of payments the type allows: 1 to 3 (months) or 1 to 13 (weeks)
    */
   public get paymentOptions(): number[] {
      const type: LoanType | '' = this.$model().type;

      return type ? Array.from({ length: LOAN_MAX_PAYMENTS[type] }, (_: unknown, index: number) => index + 1) : [];
   }

   public choiceOf({ id }: { id: string }): LoanFundChoice {
      return this.$investors()[id] ?? NOT_CHOSEN;
   }

   /**
    * Empty form & borrowers to start a new loan
    */
   public start(): void {
      this.$editId.set(null);
      clearTimeout(this.searchTimer);
      this.searchVersion++;
      this.$form().reset({ ...EMPTY_MODEL });
      this.$borrower.set(null);
      this.$borrowers.set([]);
      this.resetFunds();
      this.$saving.set(false);
      this.$active.set(true);
      this.loadBorrowers({ search: '' });
   }

   /**
    * Continues a pending loan: the form starts with its data (all of it can change) & the
    * money isn't chosen yet. Returns false when the loan couldn't be read.
    */
   public async startEdit({ id }: { id: string }): Promise<boolean> {
      const { route, method } = this.routes.detail;
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

      this._dialogs.loading = true;

      try {
         const loan: LoanDetail = await firstValueFrom(
            this._http.request<LoanDetail>(method, `${environment.apiUrl}${route}${id}`, { context }),
         );

         this.start();
         this.$editId.set(id);
         this.$form().reset({
            borrower_id: loan.borrower.id,
            amount: loan.amount,
            type: loan.type,
            no_payments: loan.no_payments,
         });
         // the selector shows the borrower of the loan even before the list arrives
         this.$borrower.set({
            id: loan.borrower.id,
            fullname: loan.borrower.fullname,
            username: loan.borrower.username,
            curp: loan.borrower.curp,
            profile: 'borrower',
            created_at: loan.request_date,
            status: { id: '', slug: 'active', title: '' },
            pending_cancellation: false,
         });

         return true;
      } catch {
         // the error interceptor already notifies the user
         return false;
      } finally {
         this._dialogs.loading = false;
      }
   }

   /**
    * Looks for borrowers while the user types, waiting until it stops
    */
   public searchBorrowers({ search }: { search: string }): void {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.loadBorrowers({ search: search.trim() }), LOAN_BORROWERS_SEARCH_DELAY);
   }

   public selectBorrower({ borrower }: { borrower: UserRow | null }): void {
      this.$borrower.set(borrower);
      this.$form.borrower_id().value.set(borrower?.id ?? '');
      this.$form.borrower_id().markAsTouched();
   }

   /**
    * The number of payments depends on the type, so it is chosen again
    */
   public selectType({ type }: { type: LoanType | null }): void {
      this.$form.type().value.set(type ?? '');
      this.$form.type().markAsTouched();
      this.$form.no_payments().value.set(null);
      this.resetFunds();
   }

   public selectPayments({ payments }: { payments: number | null }): void {
      this.$form.no_payments().value.set(payments);
      this.$form.no_payments().markAsTouched();
      this.resetFunds();
   }

   /**
    * Checks or unchecks a place: when checked it takes what is still missing, as much as it has
    */
   public toggleGeneral({ checked }: { checked: boolean }): void {
      const available: number = this.funds?.general_available ?? 0;

      this.$general.set(
         checked ? { checked, amount: this.suggest({ available, exclude: 'general' }) } : { ...NOT_CHOSEN },
      );
   }

   public toggleInvestor({ investor, checked }: { investor: LoanInvestorFund; checked: boolean }): void {
      const choice: LoanFundChoice = checked
         ? { checked, amount: this.suggest({ available: investor.available, exclude: investor.id }) }
         : { ...NOT_CHOSEN };

      this.$investors.update((current: Record<string, LoanFundChoice>) => ({ ...current, [investor.id]: choice }));
   }

   public setGeneralAmount({ amount }: { amount: number | null }): void {
      this.$general.update((current: LoanFundChoice) => ({ ...current, amount }));
   }

   public setInvestorAmount({ id, amount }: { id: string; amount: number | null }): void {
      this.$investors.update((current: Record<string, LoanFundChoice>) => ({
         ...current,
         [id]: { ...this.choiceOf({ id }), amount },
      }));
   }

   /**
    * Registers the request as pending: no money is taken from any place
    */
   public save(): void {
      this.send({ approve: false });
   }

   /**
    * Registers the request & approves it with the money of the checked places
    */
   public approve(): void {
      this.send({ approve: true });
   }

   private resetFunds(): void {
      this.$general.set({ ...NOT_CHOSEN });
      this.$investors.set({});
   }

   /**
    * Amount (currency units) a place would give: what is missing to cover the loan, up
    * to what it has. The place that is being checked isn't counted.
    */
   private suggest({ available, exclude }: { available: number; exclude: string }): number | null {
      let others: number = 0;

      if (exclude !== 'general' && this.$general().checked) others += cents(this.$general().amount);

      for (const [id, choice] of Object.entries(this.$investors())) {
         if (id !== exclude && choice.checked) others += cents(choice.amount);
      }

      const missing: number = cents(this.$model().amount) - others;

      return missing > 0 ? Math.min(missing, cents(available)) / 100 : null;
   }

   private async loadBorrowers({ search }: { search: string }): Promise<void> {
      if (!this._session.token) return;

      const version: number = ++this.searchVersion;
      const { route, method } = this.routes.users;
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);
      const body: Record<string, string | number> = {
         page: 1,
         size: LOAN_BORROWERS_PAGE_SIZE,
         profile: 'borrower',
         status: 'active',
      };

      if (search) body['search'] = search;

      this.$searching.set(true);

      try {
         const page: UsersPage = await firstValueFrom(
            this._http.request<UsersPage>(method, `${environment.apiUrl}${route}`, { body, context }),
         );

         // a slower previous search can't replace a newer one
         if (version === this.searchVersion) this.$borrowers.set(page.items);
      } catch {
         // the error interceptor already notifies the user
      } finally {
         if (version === this.searchVersion) this.$searching.set(false);
      }
   }

   /**
    * Validates, confirms & registers the loan. With `approve` it also sends the money taken from each place.
    */
   private send({ approve }: { approve: boolean }): void {
      submit(this.$form, async () => {
         if (approve && !this.$fundsValid()) return;

         try {
            await this._dialogs.confirmation({
               message: approve ? DIALOG_I18N_KEYS.CONFIRM_APPROVE_LOAN : DIALOG_I18N_KEYS.CONFIRM_SAVE_LOAN,
            });
         } catch {
            return;
         }

         const value: FieldsLoan = this.$form().value();
         const body: Record<string, unknown> = {
            borrower_id: value.borrower_id,
            amount: value.amount,
            type: value.type,
            no_payments: value.no_payments,
         };

         if (approve) {
            const investors = (this.funds?.investors ?? [])
               .filter((investor: LoanInvestorFund) => this.choiceOf({ id: investor.id }).checked)
               .map((investor: LoanInvestorFund) => ({
                  investor_id: investor.id,
                  amount: this.choiceOf({ id: investor.id }).amount,
               }));

            body['funds'] = {
               general: this.$general().checked ? this.$general().amount : 0,
               investors,
            };
         }

         const { route, method } = this.routes.create;
         const editing: string | null = this.$editId();
         const url: string = editing
            ? `${environment.apiUrl}${API_ROUTES.UPDATELOAN}${editing}`
            : `${environment.apiUrl}${route}`;

         this.$saving.set(true);
         this._dialogs.loading = true;

         try {
            await firstValueFrom(this._http.request<Loan>(editing ? HTTP_METHODS.PUT : method, url, { body }));

            this.$saving.set(false);
            this._dialogs.loading = false;
            this._dialogs.closeDialogs();
            this._list.reload();
         } catch {
            // the error interceptor already notifies the user
         } finally {
            this.$saving.set(false);
            this._dialogs.loading = false;
         }
      }).then((state: boolean) => {
         if (state) return;

         this._dialogs.alert({
            severity: 'error',
            title: FORMS_I18N_KEYS.ERROR_TITLE,
            text: FORMS_I18N_KEYS.VAL_COMPLETE_CORRECTLY,
         });
      });
   }
}
