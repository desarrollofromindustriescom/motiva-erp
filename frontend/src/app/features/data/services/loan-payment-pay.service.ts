import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { disabled, form, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { FieldsLoanPayment, LoanPayment } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { FORMS_CUSTOM_VALIDATIONS, FORMS_I18N_KEYS } from '../repository/forms.repository';
import { environment } from '../../../../environments/environment.development';
import { monetaryRules } from '../../web/utilities/validators/numeric.validators';
import { DialogsService } from './dialogs.service';
import { LoanDetailService } from './loan-detail.service';
import { LoanPaymentsService } from './loan-payments.service';
import { LoansListService } from './loans-list.service';

const cents = (value: number): number => Math.round(value * 100);

/**
 * Payment to the debt of a payment of a loan, or to the debt of the whole loan: all of it or less.
 * A payment can only be paid when it is the next one; a payment to the loan pays the current
 * payment first & the rest goes to the last payments (the backend validates both).
 */
@Injectable({ providedIn: 'root' })
export class LoanPaymentPayService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _payments: LoanPaymentsService = inject(LoanPaymentsService);
   private readonly _detail: LoanDetailService = inject(LoanDetailService);
   private readonly _list: LoansListService = inject(LoansListService);

   private readonly route: EndpointData = { route: API_ROUTES.PAYLOANPAYMENT, method: HTTP_METHODS.POST };

   private readonly $loanId: WritableSignal<string | null> = signal(null);
   // payment that is going to be paid, none when it is a payment to the whole loan
   private readonly $payment: WritableSignal<LoanPayment | null> = signal(null);
   // what the whole loan owes (only for a payment to the loan)
   private readonly $loanDebt: WritableSignal<number> = signal(0);
   private readonly $saving: WritableSignal<boolean> = signal(false);
   private readonly $model: WritableSignal<FieldsLoanPayment> = signal({ amount: null });

   // what is still owed: by the payment (its amount minus what has been paid) or by the whole loan
   private readonly $debt: Signal<number> = computed(() => {
      const payment: LoanPayment | null = this.$payment();

      return payment ? (cents(payment.amount) - cents(payment.paid)) / 100 : this.$loanDebt();
   });

   private readonly $form: SignalForm<FieldsLoanPayment> = form(
      this.$model,
      (schema: FormSchema<FieldsLoanPayment>) => {
         monetaryRules(schema.amount);

         validate(schema.amount, ({ value }) => {
            const amount: number | null = value();

            if (amount === null || cents(amount) <= cents(this.$debt())) return null;

            return { kind: FORMS_CUSTOM_VALIDATIONS.EXCEEDS_DEBT, message: FORMS_I18N_KEYS.VAL_EXCEEDS_DEBT };
         });

         disabled(schema.amount, { when: () => this.$saving() });
      },
   );

   public get form(): SignalForm<FieldsLoanPayment> {
      return this.$form;
   }

   public get saving(): boolean {
      return this.$saving();
   }

   public get debt(): number {
      return this.$debt();
   }

   /**
    * Empty form for the payment that is going to be paid
    */
   public start({ loanId, payment }: { loanId: string; payment: LoanPayment }): void {
      this.$loanId.set(loanId);
      this.$payment.set(payment);
      this.$loanDebt.set(0);
      this.$saving.set(false);
      this.$form().reset({ amount: null });
   }

   /**
    * Empty form to pay the loan: its debt is what its payments owe (read before opening the dialog).
    * Returns false when it couldn't be read or the loan owes nothing.
    */
   public async startLoan({ loanId }: { loanId: string }): Promise<boolean> {
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

      this._dialogs.loading = true;

      try {
         const payments: LoanPayment[] = await firstValueFrom(
            this._http.request<LoanPayment[]>(
               HTTP_METHODS.GET,
               `${environment.apiUrl}${API_ROUTES.LOANPAYMENTS}${loanId}/payments`,
               { context },
            ),
         );

         const debt: number = payments.reduce(
            (total: number, payment: LoanPayment) => total + cents(payment.amount) - cents(payment.paid),
            0,
         );

         if (debt <= 0) return false;

         this.$loanId.set(loanId);
         this.$payment.set(null);
         this.$loanDebt.set(debt / 100);
         this.$saving.set(false);
         this.$form().reset({ amount: null });

         return true;
      } catch {
         // the error interceptor already notifies the user
         return false;
      } finally {
         this._dialogs.loading = false;
      }
   }

   /**
    * Fills the amount with all the debt of the payment
    */
   public payAll(): void {
      this.$form.amount().value.set(this.$debt());
      this.$form.amount().markAsTouched();
   }

   /**
    * Validates, confirms & registers the payment, then goes back to the previous dialog (ex: the
    * payments of the loan), which is requested again together with the table & the detail of the loan
    */
   public pay(): void {
      const loanId: string | null = this.$loanId();
      const payment: LoanPayment | null = this.$payment();

      if (!loanId) return;

      submit(this.$form, async () => {
         try {
            await this._dialogs.confirmation({
               message: payment ? DIALOG_I18N_KEYS.CONFIRM_PAY_LOAN_PAYMENT : DIALOG_I18N_KEYS.CONFIRM_PAY_LOAN,
            });
         } catch {
            return;
         }

         const { route, method } = this.route;
         const { amount } = this.$form().value();

         this.$saving.set(true);
         this._dialogs.loading = true;

         try {
            await firstValueFrom(
               this._http.request(
                  method,
                  // the payment that is paid, or the whole loan
                  `${environment.apiUrl}${route}${loanId}/${payment ? `payments/${payment.id}/` : ''}pay`,
                  { body: { amount } },
               ),
            );

            this.$saving.set(false);
            this._dialogs.loading = false;
            this._dialogs.dialogBack();
            this._payments.reloadFor({ id: loanId });
            this._detail.reload({ id: loanId });
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
