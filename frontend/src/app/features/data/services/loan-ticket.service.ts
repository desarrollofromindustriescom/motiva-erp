import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { SafeUrl, DomSanitizer } from '@angular/platform-browser';
import { form, disabled, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { FieldsLoanTicket } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';
import { LOANS_I18N_KEYS, receiptFileError } from '../repository/loans.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { LoanDetailService } from './loan-detail.service';
import { LoansListService } from './loans-list.service';

/**
 * Registers how a loan was handed to the borrower: cash, or a transfer with the image of its receipt
 * (png, jpg or jpeg). It is only a record, it doesn't change the loan, & it can be done once. It is sent
 * as form data. It also gives the image of the receipt to the detail dialog.
 */
@Injectable({ providedIn: 'root' })
export class LoanTicketService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _list: LoansListService = inject(LoansListService);
   private readonly _detail: LoanDetailService = inject(LoanDetailService);
   private readonly _sanitizer: DomSanitizer = inject(DomSanitizer);

   private readonly route: EndpointData = { route: API_ROUTES.LOANTICKET, method: HTTP_METHODS.POST };

   private readonly $loanId: WritableSignal<string | null> = signal(null);
   private readonly $sending: WritableSignal<boolean> = signal(false);
   private readonly $file: WritableSignal<File | null> = signal(null);
   // translation key of the problem with the file, shown once the user tried to choose one or to send
   private readonly $fileError: WritableSignal<string | null> = signal(null);
   private readonly $model: WritableSignal<FieldsLoanTicket> = signal({ payment: 'cash' });
   private readonly $image: WritableSignal<SafeUrl | null> = signal(null);

   private imageUrl: string | null = null;
   private imageFor: string | null = null;

   private readonly $form: SignalForm<FieldsLoanTicket> = form(this.$model, (schema: FormSchema<FieldsLoanTicket>) => {
      disabled(schema.payment, { when: () => this.$sending() });
   });

   public get form(): SignalForm<FieldsLoanTicket> {
      return this.$form;
   }

   public get sending(): boolean {
      return this.$sending();
   }

   public get file(): File | null {
      return this.$file();
   }

   public get fileError(): string | null {
      return this.$fileError();
   }

   public get image(): SafeUrl | null {
      return this.$image();
   }

   /**
    * Prepares an empty form for a loan
    */
   public start({ loanId }: { loanId: string }): void {
      this.$loanId.set(loanId);
      this.$form().reset({ payment: 'cash' });
      this.$file.set(null);
      this.$fileError.set(null);
   }

   /**
    * Takes the chosen file if it's a png or jpg image that doesn't exceed the limit; the backend
    * verifies the content of the file again
    */
   public selectFile({ file }: { file: File | null }): void {
      if (!file) return;

      const error: string | null = receiptFileError({ file });

      this.$file.set(null);

      if (error) {
         this.$fileError.set(error);
         return;
      }

      this.$file.set(file);
      this.$fileError.set(null);
   }

   /**
    * Validates the form & the file (only needed with a transfer), asks for confirmation & sends the
    * data as form data. Then the table & the detail of the loan are requested again.
    */
   public send(): void {
      const loanId: string | null = this.$loanId();
      const file: File | null = this.$file();
      const transfer: boolean = this.$model().payment === 'transfer';

      if (!loanId) return;

      if (transfer && !file && !this.$fileError()) this.$fileError.set(LOANS_I18N_KEYS.TICKET_FILE_REQUIRED);

      submit(this.$form, async () => {
         if (transfer && !file) return;

         try {
            await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_LOAN_TICKET });
         } catch {
            return;
         }

         const { route, method } = this.route;
         const body: FormData = new FormData();

         body.append('payment', this.$model().payment);

         // there is no receipt of cash
         if (transfer && file) body.append('file', file);

         this.$sending.set(true);
         this._dialogs.loading = true;

         try {
            await firstValueFrom(this._http.request(method, `${environment.apiUrl}${route}${loanId}/ticket`, { body }));

            this.$file.set(null);
            this._list.reload();
            this._detail.reload({ id: loanId });
            this._dialogs.dialogBack();
         } catch {
            // the error interceptor already notified the user
         } finally {
            this.$sending.set(false);
            this._dialogs.loading = false;
         }
      }).then((state: boolean) => {
         if (state && (!transfer || file)) return;

         this._dialogs.alert({
            severity: 'error',
            title: FORMS_I18N_KEYS.ERROR_TITLE,
            text: FORMS_I18N_KEYS.VAL_COMPLETE_CORRECTLY,
         });
      });
   }

   /**
    * Requests the image of the receipt of a loan (the backend checks the user can see it)
    */
   public async loadImage({ loanId }: { loanId: string }): Promise<void> {
      if (this.imageFor === loanId && this.imageUrl) return;

      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

      this.clearImage();
      this.imageFor = loanId;

      try {
         const image: Blob = await firstValueFrom(
            this._http.request(HTTP_METHODS.GET, `${environment.apiUrl}${this.route.route}${loanId}/ticket`, {
               context,
               responseType: 'blob',
            }),
         );

         // another loan was opened while this one was loading
         if (this.imageFor !== loanId) return;

         this.imageUrl = URL.createObjectURL(image);
         this.$image.set(this._sanitizer.bypassSecurityTrustUrl(this.imageUrl));
      } catch {
         // the detail is shown without the image
      }
   }

   /**
    * Forgets the image & releases its local url
    */
   public clearImage(): void {
      if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);

      this.imageUrl = null;
      this.imageFor = null;
      this.$image.set(null);
   }
}
