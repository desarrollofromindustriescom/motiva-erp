import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { loansRoute } from '../repository/loans.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Image of the receipt of a payment made to a payment of a loan (the staff & the borrower of the loan can see it)
 */
@Injectable({ providedIn: 'root' })
export class LoanReceiptViewService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _sanitizer: DomSanitizer = inject(DomSanitizer);

   private readonly $image: WritableSignal<SafeUrl | null> = signal(null);
   private readonly $loading: WritableSignal<boolean> = signal(false);
   private readonly $failed: WritableSignal<boolean> = signal(false);

   private imageUrl: string | null = null;
   private current: string | null = null;

   public get image(): SafeUrl | null {
      return this.$image();
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get failed(): boolean {
      return this.$failed();
   }

   /**
    * Requests the image of the receipt of a payment (a deposit) of a payment of a loan
    */
   public async open({
      loanId,
      paymentId,
      depositId,
   }: {
      loanId: string;
      paymentId: string;
      depositId: string;
   }): Promise<void> {
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);
      const route: string = loansRoute({ route: API_ROUTES.LOANPAYMENTS, profile: this._session.session?.profile });
      const key: string = `${loanId}/${paymentId}/${depositId}`;

      this.clear();
      this.current = key;
      this.$loading.set(true);

      try {
         const image: Blob = await firstValueFrom(
            this._http.request(
               HTTP_METHODS.GET,
               `${environment.apiUrl}${route}${loanId}/payments/${paymentId}/deposits/${depositId}/ticket`,
               { context, responseType: 'blob' },
            ),
         );

         // another receipt was requested while this one was loading
         if (this.current !== key) return;

         this.imageUrl = URL.createObjectURL(image);
         this.$image.set(this._sanitizer.bypassSecurityTrustUrl(this.imageUrl));
      } catch {
         if (this.current === key) this.$failed.set(true);
      } finally {
         if (this.current === key) this.$loading.set(false);
      }
   }

   /**
    * Forgets the image & releases its local url
    */
   public clear(): void {
      if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);

      this.imageUrl = null;
      this.current = null;
      this.$image.set(null);
      this.$loading.set(false);
      this.$failed.set(false);
   }
}
