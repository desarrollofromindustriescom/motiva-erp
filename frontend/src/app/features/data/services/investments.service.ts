import { effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { disabled, form, required, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { InvestorBalance } from '../../../interfaces/cash-balance';
import { CashCycle, FieldsInvestment, Investment, InvestmentsPage } from '../../../interfaces/investment';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { FORMS_CUSTOM_VALIDATIONS, FORMS_I18N_KEYS } from '../repository/forms.repository';
import { INVESTMENTS_PAGE_SIZE } from '../repository/investments.repository';
import { environment } from '../../../../environments/environment.development';
import { monetaryRules } from '../../web/utilities/validators/numeric.validators';
import { DialogsService } from './dialogs.service';
import { InvestorBalanceService } from './investor-balance.service';
import { SessionService } from './session.service';

/**
 * Investments of the investor shown on its balance dialog: the paginated list
 * (active first) and the creation of a new one. The amount of a new investment
 * can't be greater than the available balance & its term is one of the active cycles.
 */
@Injectable({ providedIn: 'root' })
export class InvestmentsService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _balance: InvestorBalanceService = inject(InvestorBalanceService);

   private readonly routes: Record<'investments' | 'cycles', EndpointData> = {
      investments: { route: API_ROUTES.INVESTMENTS, method: HTTP_METHODS.QUERY },
      cycles: { route: API_ROUTES.CYCLES, method: HTTP_METHODS.GET },
   };

   private readonly $investorId: WritableSignal<string | null> = signal(null);
   private readonly $version: WritableSignal<number> = signal(0);
   private readonly $page: WritableSignal<number> = signal(1);
   // investment whose detail or movements are being shown
   private readonly $selected: WritableSignal<Investment | null> = signal(null);
   // last page received, so the table keeps its rows & paginator while the next page loads
   private readonly $last: WritableSignal<InvestmentsPage | undefined> = signal(undefined);

   private readonly $investments: HttpResourceRef<InvestmentsPage | undefined> = httpResource<InvestmentsPage>(
      (): HttpResourceRequest | undefined => {
         const id: string | null = this.$investorId();

         if (!id || !this._session.token) return undefined;

         // a new version means a new request even when nothing else changed
         this.$version();

         const { route, method } = this.routes.investments;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return {
            url: `${environment.apiUrl}${route}${id}/investments`,
            method,
            body: { page: this.$page(), size: INVESTMENTS_PAGE_SIZE },
            context,
         };
      },
   );

   private readonly $cyclesActive: WritableSignal<boolean> = signal(false);

   private readonly $cycles: HttpResourceRef<CashCycle[]> = httpResource<CashCycle[]>(
      (): HttpResourceRequest | undefined => {
         if (!this.$cyclesActive() || !this._session.token) return undefined;

         const { route, method } = this.routes.cycles;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, context };
      },
      { defaultValue: [] },
   );

   private readonly $creating: WritableSignal<boolean> = signal(false);
   private readonly $model: WritableSignal<FieldsInvestment> = signal({ amount: null, cycle_id: '' });

   private readonly $form: SignalForm<FieldsInvestment> = form(this.$model, (schema: FormSchema<FieldsInvestment>) => {
      monetaryRules(schema.amount);

      // the amount can't be greater than the balance that isn't locked by active investments
      validate(schema.amount, ({ value }) => {
         const amount: number | null = value();

         if (amount === null || this.cents(amount) <= this.cents(this._balance.balance?.available ?? 0)) return null;

         return {
            kind: FORMS_CUSTOM_VALIDATIONS.EXCEEDS_AVAILABLE,
            message: FORMS_I18N_KEYS.VAL_EXCEEDS_AVAILABLE,
         };
      });

      required(schema.cycle_id, { message: FORMS_I18N_KEYS.VAL_REQUIRED });

      disabled(schema.amount, { when: () => this.$creating() });
      disabled(schema.cycle_id, { when: () => this.$creating() });
   });

   constructor() {
      effect(() => {
         if (this.$investments.hasValue()) this.$last.set(this.$investments.value());
      });
   }

   public get selected(): Investment | null {
      return this.$selected();
   }

   public set selected(value: Investment | null) {
      this.$selected.set(value);
   }

   public get investments(): Investment[] {
      return this.$last()?.items ?? [];
   }

   public get total(): number {
      return this.$last()?.total ?? 0;
   }

   public get page(): number {
      return this.$page();
   }

   public get size(): number {
      return INVESTMENTS_PAGE_SIZE;
   }

   public get loading(): boolean {
      return this.$investments.isLoading();
   }

   public get cycles(): CashCycle[] {
      return this.$cycles.value();
   }

   public get creating(): boolean {
      return this.$creating();
   }

   public get form(): SignalForm<FieldsInvestment> {
      return this.$form;
   }

   /**
    * Starts a fresh query from the first page for an investor
    */
   public open({ investorId }: { investorId: string }): void {
      if (this.$investorId() !== investorId) this.$last.set(undefined);

      this.$investorId.set(investorId);
      this.$page.set(1);
      this.$version.update((version: number) => version + 1);
   }

   public changePage({ page }: { page: number }): void {
      this.$page.set(page);
   }

   /**
    * Prepares an empty form & asks for the active cycles before the dialog opens
    */
   public startCreation(): void {
      this.$form().reset({ amount: null, cycle_id: '' });
      this.$cyclesActive.set(true);
      this.$cycles.reload();
   }

   /**
    * Validates, confirms & creates the investment. The response is the updated
    * balance of the investor, so it's stored without asking for it again, and
    * the user goes back to the balance dialog, which shows the new investment.
    */
   public create(): void {
      const id: string | null = this.$investorId();

      if (!id) return;

      submit(this.$form, async () => {
         try {
            await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_INVESTMENT });
         } catch {
            return;
         }

         const { route } = this.routes.investments;
         const value: FieldsInvestment = this.$form().value();

         this.$creating.set(true);
         this._dialogs.loading = true;

         try {
            const balance: InvestorBalance = await firstValueFrom(
               this._http.request<InvestorBalance>(
                  HTTP_METHODS.POST,
                  `${environment.apiUrl}${route}${id}/investments`,
                  { body: { amount: value.amount, cycle_id: value.cycle_id } },
               ),
            );

            this._balance.update({ balance });
            this.$form().reset({ amount: null, cycle_id: '' });
            this.$creating.set(false);
            this._dialogs.loading = false;
            this._dialogs.dialogBack();
         } catch {
            // the error interceptor already notifies the user
         } finally {
            this.$creating.set(false);
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

   private cents(value: number): number {
      return Math.round(value * 100);
   }
}
