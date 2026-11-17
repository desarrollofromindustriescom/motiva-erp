import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { disabled, form, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { CashMovement, FieldsCashMovement, InvestorBalance } from '../../../interfaces/cash-balance';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { FORMS_CUSTOM_VALIDATIONS, FORMS_I18N_KEYS } from '../repository/forms.repository';
import { environment } from '../../../../environments/environment.development';
import { monetaryRules } from '../../web/utilities/validators/numeric.validators';
import { DialogsService } from './dialogs.service';
import { SessionService } from './session.service';

/**
 * Cash balance & basic data of the investor shown on its investments dialog.
 * Data is only requested after `open()` and it's requested again every time it's called.
 */
@Injectable({ providedIn: 'root' })
export class InvestorBalanceService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   private readonly route: EndpointData = { route: API_ROUTES.INVESTORBALANCE, method: HTTP_METHODS.GET };

   private readonly $id: WritableSignal<string | null> = signal(null);
   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $balance: HttpResourceRef<InvestorBalance | undefined> = httpResource<InvestorBalance>(
      (): HttpResourceRequest | undefined => {
         const id: string | null = this.$id();

         if (!id || !this._session.token) return undefined;

         // a new version means a new request even for the same investor
         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}${id}/balance`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$balance.isLoading());

   private readonly $movement: WritableSignal<CashMovement> = signal('deposit');
   private readonly $moving: WritableSignal<boolean> = signal(false);
   private readonly $modelDeposit: WritableSignal<FieldsCashMovement> = signal({ amount: null });
   private readonly $modelWithdraw: WritableSignal<FieldsCashMovement> = signal({ amount: null });

   private readonly $formDeposit: SignalForm<FieldsCashMovement> = form(
      this.$modelDeposit,
      (schema: FormSchema<FieldsCashMovement>) => {
         monetaryRules(schema.amount);

         disabled(schema.amount, { when: () => this.$moving() });
      },
   );

   private readonly $formWithdraw: SignalForm<FieldsCashMovement> = form(
      this.$modelWithdraw,
      (schema: FormSchema<FieldsCashMovement>) => {
         monetaryRules(schema.amount);

         validate(schema.amount, ({ value }) => {
            const amount: number | null = value();

            if (amount === null || this.cents(amount) <= this.cents(this.balance?.amount ?? 0)) return null;

            return {
               kind: FORMS_CUSTOM_VALIDATIONS.EXCEEDS_BALANCE,
               message: FORMS_I18N_KEYS.VAL_EXCEEDS_BALANCE,
            };
         });

         disabled(schema.amount, { when: () => this.$moving() });
      },
   );

   constructor() {}

   public get id(): string | null {
      return this.$id();
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get balance(): InvestorBalance | undefined {
      return this.$balance.hasValue() ? this.$balance.value() : undefined;
   }

   public get failed(): boolean {
      return this.$balance.error() !== undefined;
   }

   public open({ id }: { id: string }): void {
      this.$id.set(id);
      this.$version.update((version: number) => version + 1);
   }

   // deposit & withdrawal share the same flow, only the endpoint, form & confirmation change
   private readonly movements: Record<CashMovement, { path: string; confirm: string }> = {
      deposit: { path: 'balance/deposit', confirm: DIALOG_I18N_KEYS.CONFIRM_DEPOSIT },
      withdraw: { path: 'balance/withdraw', confirm: DIALOG_I18N_KEYS.CONFIRM_WITHDRAW },
   };

   public get movement(): CashMovement {
      return this.$movement();
   }

   public get moving(): boolean {
      return this.$moving();
   }

   public get movementForm(): SignalForm<FieldsCashMovement> {
      return this.$movement() === 'deposit' ? this.$formDeposit : this.$formWithdraw;
   }

   /**
    * Prepares an empty form for the movement before its dialog opens
    */
   public startMovement({ movement }: { movement: CashMovement }): void {
      this.$movement.set(movement);
      this.movementForm().reset({ amount: null });
   }

   /**
    * Balance after applying the movement, so the dialog can show it while
    * the user types. Cents are used to avoid floating point errors.
    */
   public afterMovement({ amount }: { amount: number | null }): number {
      const current: number = this.cents(this.balance?.amount ?? 0);
      const value: number = this.cents(amount ?? 0);

      return (this.$movement() === 'deposit' ? current + value : current - value) / 100;
   }

   /**
    * Validates, confirms & sends the movement. The updated balance comes in the
    * response, so it's stored without asking for it again, and the user goes
    * back to the dialog that shows the balance of the investor.
    */
   public submitMovement(): void {
      const id: string | null = this.$id();
      const movement: CashMovement = this.$movement();
      const target: SignalForm<FieldsCashMovement> = this.movementForm;
      const { path, confirm } = this.movements[movement];

      if (!id) return;

      submit(target, async () => {
         try {
            await this._dialogs.confirmation({ message: confirm });
         } catch {
            return;
         }

         this.$moving.set(true);
         this._dialogs.loading = true;

         try {
            const saved: InvestorBalance = await firstValueFrom(
               this._http.request<InvestorBalance>(
                  HTTP_METHODS.POST,
                  `${environment.apiUrl}${this.route.route}${id}/${path}`,
                  { body: { amount: target().value().amount } },
               ),
            );

            this.$balance.set(saved);
            target().reset({ amount: null });
            this.$moving.set(false);
            this._dialogs.loading = false;
            this._dialogs.dialogBack();
         } catch {
            // the error interceptor already notifies the user
         } finally {
            this.$moving.set(false);
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
