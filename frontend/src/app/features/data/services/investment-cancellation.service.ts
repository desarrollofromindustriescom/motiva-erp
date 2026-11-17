import { effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { disabled, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema, SignalForm } from '../../../interfaces/alias';
import { InvestorBalance } from '../../../interfaces/cash-balance';
import { FieldsCancellation, Investment, InvestmentsPage } from '../../../interfaces/investment';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';
import {
   CANCELLATION_FILE_MAX_BYTES,
   CANCELLATION_MESSAGE_MAX,
   INVESTMENTS_I18N_KEYS,
} from '../repository/investments.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { InvestorBalanceService } from './investor-balance.service';
import { SessionService } from './session.service';

/**
 * Cancellation request of investments before their term: the pdf of the request,
 * the active investments it applies to & the reasons. It's sent as form data and
 * the investor can only have one pending request at a time (the balance says so).
 */
@Injectable({ providedIn: 'root' })
export class InvestmentCancellationService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _balance: InvestorBalanceService = inject(InvestorBalanceService);

   private readonly routes: Record<'investments' | 'cancellations', EndpointData> = {
      investments: { route: API_ROUTES.INVESTMENTS, method: HTTP_METHODS.QUERY },
      cancellations: { route: API_ROUTES.CANCELLATIONS, method: HTTP_METHODS.POST },
   };

   private readonly $active: WritableSignal<boolean> = signal(false);
   private readonly $version: WritableSignal<number> = signal(0);
   private readonly $sending: WritableSignal<boolean> = signal(false);
   private readonly $file: WritableSignal<File | null> = signal(null);
   // translation key of the problem with the file, shown once the user tried to choose one or to send
   private readonly $fileError: WritableSignal<string | null> = signal(null);
   private readonly $model: WritableSignal<FieldsCancellation> = signal({ investments: [], message: '' });

   // every active investment of the investor (only those can be cancelled)
   private readonly $investments: HttpResourceRef<InvestmentsPage | undefined> = httpResource<InvestmentsPage>(
      (): HttpResourceRequest | undefined => {
         const id: string | null = this._balance.id;

         if (!this.$active() || !id || !this._session.token) return undefined;

         this.$version();

         const { route, method } = this.routes.investments;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return {
            url: `${environment.apiUrl}${route}${id}/investments`,
            method,
            body: { page: 1, size: 100, status: 'active' },
            context,
         };
      },
   );

   private readonly $form: SignalForm<FieldsCancellation> = form(
      this.$model,
      (schema: FormSchema<FieldsCancellation>) => {
         // at least one investment must be chosen
         validate(schema.investments, ({ value }) =>
            value().length > 0 ? null : { kind: 'required', message: FORMS_I18N_KEYS.VAL_REQUIRED },
         );

         required(schema.message, { message: FORMS_I18N_KEYS.VAL_REQUIRED });
         maxLength(schema.message, CANCELLATION_MESSAGE_MAX, { message: FORMS_I18N_KEYS.VAL_MAX_LENGTH });

         disabled(schema.investments, { when: () => this.$sending() });
         disabled(schema.message, { when: () => this.$sending() });
      },
   );

   constructor() {
      // keep the selection valid if the list of active investments changes
      effect(() => {
         const ids: Set<string> = new Set(this.investments.map((investment: Investment) => investment.id));
         const selected: string[] = this.$model().investments;

         if (ids.size > 0 && selected.some((id: string) => !ids.has(id))) {
            this.$model.update((model: FieldsCancellation) => ({
               ...model,
               investments: model.investments.filter((id: string) => ids.has(id)),
            }));
         }
      });
   }

   public get form(): SignalForm<FieldsCancellation> {
      return this.$form;
   }

   public get investments(): Investment[] {
      return this.$investments.hasValue() ? (this.$investments.value()?.items ?? []) : [];
   }

   public get loadingInvestments(): boolean {
      return this.$investments.isLoading();
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

   /**
    * Prepares an empty form for the investor shown in the balance dialog
    */
   public start(): void {
      this.$form().reset({ investments: [], message: '' });
      this.$file.set(null);
      this.$fileError.set(null);
      this.$active.set(true);
      this.$version.update((version: number) => version + 1);
   }

   /**
    * Takes the chosen file if it's a pdf that doesn't exceed the limit; the
    * backend verifies the content of the file again
    */
   public selectFile({ file }: { file: File | null }): void {
      if (!file) return;

      const isPdf: boolean = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      this.$file.set(null);

      if (!isPdf) {
         this.$fileError.set(INVESTMENTS_I18N_KEYS.CANCEL_FILE_NOT_PDF);
         return;
      }

      if (file.size > CANCELLATION_FILE_MAX_BYTES) {
         this.$fileError.set(INVESTMENTS_I18N_KEYS.CANCEL_FILE_TOO_LARGE);
         return;
      }

      this.$file.set(file);
      this.$fileError.set(null);
   }

   /**
    * Validates the form & the file, asks for confirmation & sends the request as
    * form data. The response is the updated balance of the investor (with a
    * pending cancellation), so it's stored & the user goes back to the balance dialog.
    */
   public send(): void {
      const id: string | null = this._balance.id;
      const file: File | null = this.$file();

      if (!id) return;

      if (!file && !this.$fileError()) this.$fileError.set(INVESTMENTS_I18N_KEYS.CANCEL_FILE_REQUIRED);

      submit(this.$form, async () => {
         if (!file) return;

         try {
            await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_CANCELLATION });
         } catch {
            return;
         }

         const { route, method } = this.routes.cancellations;
         const value: FieldsCancellation = this.$form().value();
         const body: FormData = new FormData();

         body.append('document', file);
         body.append('message', value.message.trim());

         for (const investment of value.investments) body.append('investments', investment);

         this.$sending.set(true);
         this._dialogs.loading = true;

         try {
            const balance: InvestorBalance = await firstValueFrom(
               this._http.request<InvestorBalance>(method, `${environment.apiUrl}${route}${id}/cancellations`, {
                  body,
               }),
            );

            this._balance.update({ balance });
            this.$file.set(null);
            this.$sending.set(false);
            this._dialogs.loading = false;
            this._dialogs.dialogBack();
         } catch {
            // the error interceptor already notified the user
         } finally {
            this.$sending.set(false);
            this._dialogs.loading = false;
         }
      }).then((state: boolean) => {
         if (state && file) return;

         this._dialogs.alert({
            severity: 'error',
            title: FORMS_I18N_KEYS.ERROR_TITLE,
            text: FORMS_I18N_KEYS.VAL_COMPLETE_CORRECTLY,
         });
      });
   }
}
