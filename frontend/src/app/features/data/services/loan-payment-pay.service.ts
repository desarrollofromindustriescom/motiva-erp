import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { disabled, form, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { FieldsLoanPayment, LoanPayment } from '../../../interfaces/loan';
import { API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
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
 * Payment to the debt of a payment of a loan: all of it or less. It is only
 * possible on the next payment, the backend validates it too.
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
   private readonly $payment: WritableSignal<LoanPayment | null> = signal(null);
   private readonly $saving: WritableSignal<boolean> = signal(false);
   private readonly $model: WritableSignal<FieldsLoanPayment> = signal({ amount: null });

   // what the payment still owes: its amount minus what has been paid
   private readonly $debt: Signal<number> = computed(() => {
      const payment: LoanPayment | null = this.$payment();

      return payment ? (cents(payment.amount) - cents(payment.paid)) / 100 : 0;
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
      this.$saving.set(false);
      this.$form().reset({ amount: null });
   }

   /**
    * Fills the amount with all the debt of the payment
    */
   public payAll(): void {
      this.$form.amount().value.set(this.$debt());
      this.$form.amount().markAsTouched();
   }

   /**
    * Validates, confirms & registers the payment, then goes back to the payments of the loan,
    * which are requested again (the table & the detail of the loan too, they may have changed)
    */
   public pay(): void {
      const loanId: string | null = this.$loanId();
      const payment: LoanPayment | null = this.$payment();

      if (!loanId || !payment) return;

      submit(this.$form, async () => {
         try {
            await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_PAY_LOAN_PAYMENT });
         } catch {
            return;
         }

         const { route, method } = this.route;
         const { amount } = this.$form().value();

         this.$saving.set(true);
         this._dialogs.loading = true;

         try {
            await firstValueFrom(
               this._http.request(method, `${environment.apiUrl}${route}${loanId}/payments/${payment.id}/pay`, {
                  body: { amount },
               }),
            );

            this.$saving.set(false);
            this._dialogs.loading = false;
            this._dialogs.dialogBack();
            this._payments.reload();
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
