import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { disabled, form, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema } from '../../../interfaces/alias';
import {
   CashBalance,
   CashBalanceForms,
   CashBalanceLoader,
   CashBalanceRoutes,
   CashMovement,
   FieldsCashMovement,
} from '../../../interfaces/cash-balance';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { FORMS_CUSTOM_VALIDATIONS, FORMS_I18N_KEYS } from '../repository/forms.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { environment } from '../../../../environments/environment.development';
import { cashMonetaryRules } from '../../web/utilities/validators/numeric.validators';
import { SessionService } from './session.service';
import { DialogsService } from './dialogs.service';

@Injectable({ providedIn: 'root' })
export class CashBalanceService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   private readonly routes: Omit<Record<CashBalanceRoutes, EndpointData>, 'movements'> = {
      cashBalance: { route: API_ROUTES.CASHBALANCE, method: HTTP_METHODS.GET },
      deposit: { route: API_ROUTES.DEPOSIT, method: HTTP_METHODS.POST },
      withdraw: { route: API_ROUTES.WITHDRAW, method: HTTP_METHODS.POST },
   };

   private readonly $updating: WritableSignal<Record<CashMovement, boolean>> = signal({
      deposit: false,
      withdraw: false,
   });

   private readonly $balance: HttpResourceRef<CashBalance | undefined> = httpResource<CashBalance>(
      (): HttpResourceRequest | undefined => {
         if (!this._session.token) return undefined;

         const { route, method } = this.routes.cashBalance;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, context };
      },
   );

   private readonly $loader: Signal<CashBalanceLoader> = computed(() => ({
      balance: this.$balance.isLoading(),
      ...this.$updating(),
   }));

   private readonly $modelDeposit: WritableSignal<FieldsCashMovement> = signal({ amount: null });
   private readonly $modelWithdraw: WritableSignal<FieldsCashMovement> = signal({ amount: null });

   private readonly $formDeposit: CashBalanceForms['deposit'] = form(
      this.$modelDeposit,
      (schema: FormSchema<FieldsCashMovement>) => {
         cashMonetaryRules(schema.amount);

         disabled(schema.amount, { when: () => this.$updating().deposit });
      },
   );

   private readonly $formWithdraw: CashBalanceForms['withdraw'] = form(
      this.$modelWithdraw,
      (schema: FormSchema<FieldsCashMovement>) => {
         cashMonetaryRules(schema.amount);

         validate(schema.amount, ({ value }) => {
            const amount: number | null = value();

            if (amount === null || this.cents(amount) <= this.cents(this.balance?.amount ?? 0)) return null;

            return {
               kind: FORMS_CUSTOM_VALIDATIONS.EXCEEDS_BALANCE,
               message: FORMS_I18N_KEYS.VAL_EXCEEDS_BALANCE,
            };
         });

         disabled(schema.amount, { when: () => this.$updating().withdraw });
      },
   );

   constructor() {}

   public get loader(): CashBalanceLoader {
      return this.$loader();
   }

   public get balance(): CashBalance | undefined {
      return this.$balance.hasValue() ? this.$balance.value() : undefined;
   }

   public get forms(): CashBalanceForms {
      return {
         deposit: this.$formDeposit,
         withdraw: this.$formWithdraw,
      };
   }

   /**
    * Fetch the balance again (only used when entering the module)
    */
   public reload(): void {
      this.$balance.reload();
   }

   /**
    * Balance after applying a movement, so dialogs can show it while
    * the user types. Cents are used to avoid floating point errors.
    */
   public afterMovement({ movement, amount }: { movement: CashMovement; amount: number | null }): number {
      const current: number = this.cents(this.balance?.amount ?? 0);
      const value: number = this.cents(amount ?? 0);

      return (movement === 'deposit' ? current + value : current - value) / 100;
   }

   /**
    * Clears one movement form
    */
   public resetForm({ movement }: { movement: CashMovement }): void {
      (movement === 'deposit' ? this.$formDeposit : this.$formWithdraw)().reset({ amount: null });
   }

   /**
    *
    */
   public deposit(): void {
      this.createMovement({ movement: 'deposit', confirm: DIALOG_I18N_KEYS.CONFIRM_DEPOSIT });
   }

   /**
    *
    */
   public withdraw(): void {
      this.createMovement({ movement: 'withdraw', confirm: DIALOG_I18N_KEYS.CONFIRM_WITHDRAW });
   }

   /**
    * Validates, confirms & sends the movement. The updated balance comes
    * in the response, so it's stored without fetching it again.
    */
   private createMovement({ movement, confirm }: { movement: CashMovement; confirm: string }): void {
      const target = movement === 'deposit' ? this.$formDeposit : this.$formWithdraw;
      const { method, route } = this.routes[movement];

      submit(target, async () => {
         try {
            await this._dialogs.confirmation({ message: confirm });
         } catch {
            return;
         }

         this.setUpdating({ movement, value: true });

         try {
            const saved: CashBalance = await firstValueFrom(
               this._http.request<CashBalance>(method, `${environment.apiUrl}${route}`, {
                  body: { amount: target().value().amount },
               }),
            );

            this.$balance.set(saved);
            this.resetForm({ movement });
            this._dialogs.closeDialogs();
         } catch {
            // the error interceptor already notifies the user
         } finally {
            this.setUpdating({ movement, value: false });
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

   /**
    *
    */
   private setUpdating({ movement, value }: { movement: CashMovement; value: boolean }): void {
      this.$updating.update((prev: Record<CashMovement, boolean>) => ({ ...prev, [movement]: value }));
   }

   /**
    *
    */
   private cents(value: number): number {
      return Math.round(value * 100);
   }
}
