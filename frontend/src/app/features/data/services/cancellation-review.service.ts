import { formatCurrency } from '@angular/common';
import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { CancellationRequest } from '../../../interfaces/investment';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { UsersListService } from './users-list.service';

/**
 * Review of the pending cancellation request of an investor: the request with its
 * investments, the pdf of the investor (an authenticated request, so it's read as a
 * blob & shown through a local url) and the answer: approve or reject. After the
 * answer the dialogs are closed & the users table is asked again (the investor
 * doesn't have a pending request anymore).
 */
@Injectable({ providedIn: 'root' })
export class CancellationReviewService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _list: UsersListService = inject(UsersListService);
   private readonly _sanitizer: DomSanitizer = inject(DomSanitizer);

   private readonly $investorId: WritableSignal<string | null> = signal(null);
   private readonly $request: WritableSignal<CancellationRequest | null> = signal(null);
   private readonly $document: WritableSignal<SafeResourceUrl | null> = signal(null);
   private readonly $loading: WritableSignal<boolean> = signal(false);
   private readonly $answering: WritableSignal<boolean> = signal(false);

   // local url of the pdf, released when it's not needed anymore
   private objectUrl: string | null = null;

   constructor() {}

   public get request(): CancellationRequest | null {
      return this.$request();
   }

   public get document(): SafeResourceUrl | null {
      return this.$document();
   }

   public get loading(): boolean {
      return this.$loading();
   }

   public get answering(): boolean {
      return this.$answering();
   }

   /**
    * Loads the pending request of the investor & its pdf. The dialog closes if
    * something fails (the error interceptor already notified the user).
    */
   public async start({ investorId }: { investorId: string }): Promise<void> {
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);
      const base: string = `${environment.apiUrl}${API_ROUTES.CANCELLATIONS}${investorId}/cancellations`;

      this.clear();
      this.$investorId.set(investorId);
      this.$loading.set(true);
      this._dialogs.loading = true;

      try {
         const request: CancellationRequest = await firstValueFrom(
            this._http.request<CancellationRequest>(HTTP_METHODS.GET, `${base}/pending`, { context }),
         );

         if (this.$investorId() !== investorId) return;

         const pdf: Blob = await firstValueFrom(
            this._http.request(HTTP_METHODS.GET, `${base}/${request.id}/document`, { context, responseType: 'blob' }),
         );

         if (this.$investorId() !== investorId) return;

         this.objectUrl = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
         this.$document.set(this._sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
         this.$request.set(request);
      } catch {
         if (this.$investorId() === investorId) this._dialogs.closeDialogs();
      } finally {
         if (this.$investorId() === investorId) {
            this.$loading.set(false);
            this._dialogs.loading = false;
         }
      }
   }

   /**
    * Forgets the request & releases the local url of the pdf
    */
   public clear(): void {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);

      this.objectUrl = null;
      this.$document.set(null);
      this.$request.set(null);
   }

   /**
    * The confirmation tells what is going to happen with the money: the total
    * of the investments leaves the balance of the investor & the rewards go to
    * the general cash balance
    */
   public async approve(): Promise<void> {
      const request: CancellationRequest | null = this.$request();

      if (!request || !request.can_approve) return;

      const money = (value: number): string => formatCurrency(value, 'en-US', '$');

      // the recovered part leaves the investor box, the reward goes to the general box
      // & the general box pays what is still lent (the rest of the total requested)
      await this.answer({
         action: 'approve',
         confirm: DIALOG_I18N_KEYS.CONFIRM_APPROVE_CANCELLATION,
         params: {
            total: money(request.total_initial),
            recovered: money(request.total_recovered),
            reward: money(request.total_reward),
            lent: money(Math.max(request.total_initial - request.total_recovered, 0)),
         },
      });
   }

   public async reject(): Promise<void> {
      await this.answer({ action: 'reject', confirm: DIALOG_I18N_KEYS.CONFIRM_REJECT_CANCELLATION });
   }

   private async answer({
      action,
      confirm,
      params,
   }: {
      action: 'approve' | 'reject';
      confirm: string;
      params?: Record<string, string>;
   }): Promise<void> {
      const investorId: string | null = this.$investorId();
      const request: CancellationRequest | null = this.$request();

      if (!investorId || !request || this.$answering()) return;

      try {
         await this._dialogs.confirmation({ message: confirm, params });
      } catch {
         return;
      }

      this.$answering.set(true);
      this._dialogs.loading = true;

      try {
         await firstValueFrom(
            this._http.request(
               HTTP_METHODS.POST,
               `${environment.apiUrl}${API_ROUTES.CANCELLATIONS}${investorId}/cancellations/${request.id}/${action}`,
            ),
         );

         this.$answering.set(false);
         this._dialogs.loading = false;
         this._dialogs.closeDialogs();
         this._list.reload();
      } catch {
         // the error interceptor already notified the user
      } finally {
         this.$answering.set(false);
         this._dialogs.loading = false;
      }
   }
}
