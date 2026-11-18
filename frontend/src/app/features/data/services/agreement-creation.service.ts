import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { disabled, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { AgreementEligible, AgreementLoan, AgreementQuote, FieldsAgreement } from '../../../interfaces/loan';
import { UserRow, UsersPage } from '../../../interfaces/user';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';
import {
   AGREEMENT_MAX_WEEKS,
   AGREEMENT_MIN_WEEKS,
   LOAN_BORROWERS_PAGE_SIZE,
   LOAN_BORROWERS_SEARCH_DELAY,
} from '../repository/loans.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { LoansListService } from './loans-list.service';
import { SessionService } from './session.service';

const EMPTY_MODEL: FieldsAgreement = { borrower_id: '', weeks: null };

// the interest is stored with 3 decimals, same as the backend
const RATE_SCALE: number = 100_000;

const cents = (value: number): number => Math.round(value * 100);

/**
 * New agreement dialog: the borrower, its active loans with at least a week of delay (the ones the user
 * checks go into the agreement), the weeks it lasts & what it costs. Starting it cancels those loans.
 * The debt is what the checked loans owe & the interest (a percentage of that debt) is added to every
 * payment, so a payment is its part of the debt plus the interest.
 */
@Injectable({ providedIn: 'root' })
export class AgreementCreationService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _list: LoansListService = inject(LoansListService);

   private readonly routes: Record<'users' | 'loans' | 'create', EndpointData> = {
      users: { route: API_ROUTES.LISTUSERS, method: HTTP_METHODS.QUERY },
      loans: { route: API_ROUTES.AGREEMENTLOANS, method: HTTP_METHODS.QUERY },
      create: { route: API_ROUTES.CREATEAGREEMENT, method: HTTP_METHODS.POST },
   };

   public readonly weeksOptions: number[] = Array.from(
      { length: AGREEMENT_MAX_WEEKS - AGREEMENT_MIN_WEEKS + 1 },
      (_: unknown, index: number) => AGREEMENT_MIN_WEEKS + index,
   );

   private readonly $saving: WritableSignal<boolean> = signal(false);
   private readonly $model: WritableSignal<FieldsAgreement> = signal({ ...EMPTY_MODEL });

   // borrowers of the selector: the first ones or the ones that match the search
   private readonly $borrowers: WritableSignal<UserRow[]> = signal([]);
   private readonly $borrower: WritableSignal<UserRow | null> = signal(null);
   private readonly $searching: WritableSignal<boolean> = signal(false);
   private searchTimer: ReturnType<typeof setTimeout> | undefined;
   private searchVersion: number = 0;

   // loans of the borrower that can go to the agreement & the ones the user checked
   private readonly $eligible: WritableSignal<AgreementEligible | null> = signal(null);
   private readonly $loadingLoans: WritableSignal<boolean> = signal(false);
   private readonly $checked: WritableSignal<string[]> = signal([]);
   // the user tried to start without checking a loan
   private readonly $loansTouched: WritableSignal<boolean> = signal(false);
   private loansVersion: number = 0;

   private readonly $form: SignalForm<FieldsAgreement> = form(this.$model, (schema: FormSchema<FieldsAgreement>) => {
      required(schema.borrower_id, { message: FORMS_I18N_KEYS.VAL_REQUIRED });
      required(schema.weeks, { message: FORMS_I18N_KEYS.VAL_REQUIRED });

      disabled(schema.borrower_id, { when: () => this.$saving() });
      disabled(schema.weeks, { when: () => this.$saving() });
   });

   // what the checked loans owe, in cents
   private readonly $debt: Signal<number> = computed(() => {
      const checked: string[] = this.$checked();

      return (this.$eligible()?.loans ?? [])
         .filter((loan: AgreementLoan) => checked.includes(loan.id))
         .reduce((total: number, loan: AgreementLoan) => total + cents(loan.debt), 0);
   });

   private readonly $quote: Signal<AgreementQuote | null> = computed(() => {
      const debt: number = this.$debt();
      const eligible: AgreementEligible | null = this.$eligible();
      const weeks: number | null = this.$model().weeks;

      if (!eligible || !weeks || debt <= 0) return null;

      // same integer math as the backend: the first payment takes the cent that is left when the debt doesn't divide
      const extra: number = Math.floor((debt * Math.round(eligible.rate * 1000) + RATE_SCALE / 2) / RATE_SCALE);
      const first: number = Math.floor(debt / weeks) + (debt % weeks > 0 ? 1 : 0) + extra;

      return { payment: first / 100, total: (debt + weeks * extra) / 100 };
   });

   public get form(): SignalForm<FieldsAgreement> {
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

   public get eligible(): AgreementEligible | null {
      return this.$eligible();
   }

   public get loadingLoans(): boolean {
      return this.$loadingLoans();
   }

   public get checked(): string[] {
      return this.$checked();
   }

   public get loansInvalid(): boolean {
      return this.$loansTouched() && this.$checked().length === 0;
   }

   // what the checked loans owe, in currency units
   public get debt(): number {
      return this.$debt() / 100;
   }

   public get quote(): AgreementQuote | null {
      return this.$quote();
   }

   /**
    * Empty form & borrowers to start a new agreement
    */
   public start(): void {
      clearTimeout(this.searchTimer);
      this.searchVersion++;
      this.loansVersion++;
      this.$form().reset({ ...EMPTY_MODEL });
      this.$borrower.set(null);
      this.$borrowers.set([]);
      this.$eligible.set(null);
      this.$checked.set([]);
      this.$loansTouched.set(false);
      this.$loadingLoans.set(false);
      this.$saving.set(false);
      this.loadBorrowers({ search: '' });
   }

   /**
    * Looks for borrowers while the user types, waiting until it stops
    */
   public searchBorrowers({ search }: { search: string }): void {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.loadBorrowers({ search: search.trim() }), LOAN_BORROWERS_SEARCH_DELAY);
   }

   /**
    * Chooses the borrower & asks for its loans that can go to the agreement
    */
   public selectBorrower({ borrower }: { borrower: UserRow | null }): void {
      this.$borrower.set(borrower);
      this.$form.borrower_id().value.set(borrower?.id ?? '');
      this.$form.borrower_id().markAsTouched();
      this.$checked.set([]);
      this.$loansTouched.set(false);
      this.$eligible.set(null);

      if (borrower) this.loadLoans({ borrowerId: borrower.id });
   }

   public toggleLoan({ id, checked }: { id: string; checked: boolean }): void {
      this.$checked.update((current: string[]) =>
         checked
            ? [...current.filter((item: string) => item !== id), id]
            : current.filter((item: string) => item !== id),
      );
   }

   public toggleAll({ checked }: { checked: boolean }): void {
      this.$checked.set(checked ? (this.$eligible()?.loans ?? []).map((loan: AgreementLoan) => loan.id) : []);
   }

   /**
    * Validates, confirms & starts the agreement: its loans are cancelled & the investors get back
    * what they lent in them. The table is requested again because the loans changed.
    */
   public begin(): void {
      this.$loansTouched.set(true);

      submit(this.$form, async () => {
         if (this.$checked().length === 0) return;

         try {
            await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_START_AGREEMENT });
         } catch {
            return;
         }

         const { route, method } = this.routes.create;
         const { borrower_id, weeks } = this.$form().value();

         this.$saving.set(true);
         this._dialogs.loading = true;

         try {
            await firstValueFrom(
               this._http.request(method, `${environment.apiUrl}${route}`, {
                  body: { borrower_id, loan_ids: this.$checked(), weeks },
               }),
            );

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

   private async loadLoans({ borrowerId }: { borrowerId: string }): Promise<void> {
      const version: number = ++this.loansVersion;
      const { route, method } = this.routes.loans;
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

      this.$loadingLoans.set(true);

      try {
         const eligible: AgreementEligible = await firstValueFrom(
            this._http.request<AgreementEligible>(method, `${environment.apiUrl}${route}`, {
               body: { borrower_id: borrowerId },
               context,
            }),
         );

         // the answer of a borrower that was already changed doesn't count
         if (version === this.loansVersion) this.$eligible.set(eligible);
      } catch {
         // the error interceptor already notifies the user
      } finally {
         if (version === this.loansVersion) this.$loadingLoans.set(false);
      }
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
}
