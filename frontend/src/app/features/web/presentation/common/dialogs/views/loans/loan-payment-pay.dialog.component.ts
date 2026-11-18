import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { FieldsLoanPayment, LoanPaymentMethod } from '../../../../../../../interfaces/loan';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanPaymentPayService } from '../../../../../../data/services/loan-payment-pay.service';
import { FieldErrorsComponent } from '../../../forms/field-errors/field-errors.component';
import { LoaderComponent } from '../../../forms/loader/loader.component';
import { LoanReceiptFieldsComponent } from './loan-receipt-fields.component';

/**
 * Payment to a payment of a loan: the debt of the payment (read only), the amount to pay, which can be
 * all of the debt (one click) or less, & how it is paid (cash or a transfer with the image of its receipt)
 */
@Component({
   selector: 'fi-loan-payment-pay-dialog-component',
   imports: [
      CurrencyPipe,
      FormField,
      TranslatePipe,
      IftaLabelModule,
      InputNumberModule,
      InputTextModule,
      FieldErrorsComponent,
      LoaderComponent,
      LoanReceiptFieldsComponent,
   ],
   template: `
      @let form = $form;
      @let saving = $saving();

      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <p-iftalabel class="w-full">
               <input
                  pInputText
                  id="debt"
                  class="w-full bg-slate-200!"
                  readonly
                  tabindex="-1"
                  [value]="$debt() | currency"
               />
               <label for="debt">{{ I18N.PAYMENT_DEBT | translate }}</label>
            </p-iftalabel>

            <fi-field-errors-component
               class="w-full"
               [field]="form.amount()"
            >
               <p-iftalabel class="w-full">
                  <p-inputnumber
                     class="w-full"
                     inputId="amount"
                     inputStyleClass="w-full"
                     mode="decimal"
                     prefix="$ "
                     locale="en-US"
                     [minFractionDigits]="0"
                     [maxFractionDigits]="2"
                     [formField]="form.amount"
                  />
                  <label for="amount">{{ I18N.PAYMENT_AMOUNT | translate }} *</label>
               </p-iftalabel>
            </fi-field-errors-component>
         </div>

         <button
            class="text-second w-fit cursor-pointer px-1 text-xs italic hover:underline disabled:cursor-auto disabled:opacity-60"
            type="button"
            [disabled]="saving"
            (click)="handleAll()"
         >
            {{ I18N.PAYMENT_FULL | translate }} →
         </button>

         <fi-loan-receipt-fields-component
            class="pt-2"
            [payment]="form.payment().value()"
            [file]="$file()"
            [fileError]="$fileError()"
            [disabled]="saving"
            (paymentChange)="handlePayment($event)"
            (fileChange)="handleFile($event)"
         />

         <div class="flex w-full flex-col-reverse items-center gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="saving"
               (click)="handleClose()"
            >
               {{ FORMS.BUTTON_CLOSE | translate }}
            </button>
            <button
               class="bg-contrast flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="saving"
               (click)="handlePay()"
            >
               @if (saving) {
                  <fi-loader-component tone="white" />
               }
               {{ I18N.PAYMENT_DEPOSIT | translate }}
            </button>
         </div>
      </form>
   `,
})
export class LoanPaymentPayDialogComponent {
   private readonly _pay: LoanPaymentPayService = inject(LoanPaymentPayService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;

   public readonly $form: SignalForm<FieldsLoanPayment> = this._pay.form;
   public readonly $saving: Signal<boolean> = computed(() => this._pay.saving);
   public readonly $debt: Signal<number> = computed(() => this._pay.debt);
   public readonly $file: Signal<File | null> = computed(() => this._pay.file);
   public readonly $fileError: Signal<string | null> = computed(() => this._pay.fileError);

   public handlePayment(value: LoanPaymentMethod): void {
      this.$form.payment().value.set(value);
   }

   public handleFile(file: File): void {
      this._pay.selectFile({ file });
   }

   public handleAll(): void {
      this._pay.payAll();
   }

   public handleClose(): void {
      this._dialogs.dialogBack();
   }

   public handlePay(): void {
      this._pay.pay();
   }
}
