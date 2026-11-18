import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { LoanDetailService } from './loan-detail.service';
import { LoanPaymentDepositsService } from './loan-payment-deposits.service';
import { LoanPaymentsService } from './loan-payments.service';
import { LoansListService } from './loans-list.service';

/**
 * An administrator accepts or rejects a payment that a borrower reported (it is pending): an accepted one
 * counts as paid like any other & a rejected one never does
 */
@Injectable({ providedIn: 'root' })
export class LoanDepositAnswerService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _deposits: LoanPaymentDepositsService = inject(LoanPaymentDepositsService);
   private readonly _payments: LoanPaymentsService = inject(LoanPaymentsService);
   private readonly _detail: LoanDetailService = inject(LoanDetailService);
   private readonly _list: LoansListService = inject(LoansListService);

   private readonly route: EndpointData = { route: API_ROUTES.ANSWERLOANDEPOSIT, method: HTTP_METHODS.POST };

   /**
    * Confirms & answers the pending payment, then requests again what depends on it: the payments
    * made, the payments of the loan, its detail & the table
    */
   public async answer({
      loanId,
      paymentId,
      depositId,
      accept,
   }: {
      loanId: string;
      paymentId: string;
      depositId: string;
      accept: boolean;
   }): Promise<void> {
      try {
         await this._dialogs.confirmation({
            message: accept ? DIALOG_I18N_KEYS.CONFIRM_ACCEPT_DEPOSIT : DIALOG_I18N_KEYS.CONFIRM_REJECT_DEPOSIT,
         });
      } catch {
         return;
      }

      const { route, method } = this.route;

      this._dialogs.loading = true;

      try {
         await firstValueFrom(
            this._http.request(
               method,
               `${environment.apiUrl}${route}${loanId}/payments/${paymentId}/deposits/${depositId}/${accept ? 'accept' : 'reject'}`,
            ),
         );

         this._deposits.reload();
         this._payments.reloadFor({ id: loanId });
         this._detail.reload({ id: loanId });
         this._list.reload();
      } catch {
         // the error interceptor already notifies the user
         this._deposits.reload();
      } finally {
         this._dialogs.loading = false;
      }
   }
}
