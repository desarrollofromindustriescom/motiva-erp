import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { FieldsLoanTicket, LoanPaymentMethod } from '../../../../../../../interfaces/loan';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanTicketService } from '../../../../../../data/services/loan-ticket.service';
import { LoaderComponent } from '../../../forms/loader/loader.component';
import { LoanReceiptFieldsComponent } from './loan-receipt-fields.component';

/**
 * How a loan was handed to the borrower: the type of payment (radio) & the image of the
 * receipt (chosen or dragged) that only a transfer has. It is only a record of the loan.
 */
@Component({
   selector: 'fi-loan-ticket-dialog-component',
   imports: [TranslatePipe, LoaderComponent, LoanReceiptFieldsComponent],
   template: `
      @let sending = $sending();
      @let file = $file();
      @let fileError = $fileError();

      <form
         class="flex w-full flex-col gap-4"
         (submit)="$event.preventDefault()"
      >
         <fi-loan-receipt-fields-component
            [payment]="$form.payment().value()"
            [file]="file"
            [fileError]="fileError"
            [disabled]="sending"
            (paymentChange)="handlePayment($event)"
            (fileChange)="handleFile($event)"
         />

         <div class="flex w-full flex-col-reverse items-center gap-2 sm:flex-row sm:justify-end">
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="sending"
               (click)="handleCancel()"
            >
               {{ FORMS.BUTTON_CLOSE | translate }}
            </button>
            <button
               class="bg-contrast flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="sending"
               (click)="handleSend()"
            >
               @if (sending) {
                  <fi-loader-component tone="white" />
               }
               {{ I18N.TICKET_BUTTON | translate }}
            </button>
         </div>
      </form>
   `,
})
export class LoanTicketDialogComponent {
   private readonly _ticket: LoanTicketService = inject(LoanTicketService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;

   public readonly $form: SignalForm<FieldsLoanTicket> = this._ticket.form;
   public readonly $sending: Signal<boolean> = computed(() => this._ticket.sending);
   public readonly $file: Signal<File | null> = computed(() => this._ticket.file);
   public readonly $fileError: Signal<string | null> = computed(() => this._ticket.fileError);

   public handlePayment(value: LoanPaymentMethod): void {
      this.$form.payment().value.set(value);
   }

   public handleFile(file: File): void {
      this._ticket.selectFile({ file });
   }

   public handleCancel(): void {
      this._dialogs.dialogBack();
   }

   public handleSend(): void {
      this._ticket.send();
   }
}
