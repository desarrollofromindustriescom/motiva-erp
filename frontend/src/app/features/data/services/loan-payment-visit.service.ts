import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { LoanPaymentsService } from './loan-payments.service';

/**
 * Registers a visit to a payment of a loan: its price is fixed in the settings & is added to
 * what the payment costs. It is only possible on the current payment, the backend validates it too.
 */
@Injectable({ providedIn: 'root' })
export class LoanPaymentVisitService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _payments: LoanPaymentsService = inject(LoanPaymentsService);

   private readonly route: EndpointData = { route: API_ROUTES.ADDLOANVISIT, method: HTTP_METHODS.POST };

   /**
    * Confirms & registers the visit, then requests the payments again (their amounts changed)
    */
   public async add({ loanId, paymentId }: { loanId: string; paymentId: string }): Promise<void> {
      try {
         await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_ADD_VISIT });
      } catch {
         return;
      }

      const { route, method } = this.route;

      this._dialogs.loading = true;

      try {
         await firstValueFrom(
            this._http.request(method, `${environment.apiUrl}${route}${loanId}/payments/${paymentId}/visits`),
         );

         this._payments.reload();
      } catch {
         // the error interceptor already notifies the user
      } finally {
         this._dialogs.loading = false;
      }
   }
}
