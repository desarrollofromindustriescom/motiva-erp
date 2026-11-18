import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { CalendarDay } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { downloadBlob, fileDate } from '../../web/utilities/files/download';
import { SessionService } from './session.service';

/**
 * Calendar of payments: the active loans grouped by the weekday of their current payment. Data is
 * only requested after `open()` and it's requested again every time it's called.
 */
@Injectable({ providedIn: 'root' })
export class LoansCalendarService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.LOANSCALENDAR, method: HTTP_METHODS.GET };

   private readonly excel: EndpointData = { route: API_ROUTES.LOANSCALENDAREXCEL, method: HTTP_METHODS.GET };

   private readonly $downloading: WritableSignal<boolean> = signal(false);
   private readonly $active: WritableSignal<boolean> = signal(false);
   private readonly $version: WritableSignal<number> = signal(0);

   private readonly $calendar: HttpResourceRef<CalendarDay[] | undefined> = httpResource<CalendarDay[]>(
      (): HttpResourceRequest | undefined => {
         if (!this.$active() || !this._session.token) return undefined;

         // a new version means a new request even when nothing else changed
         this.$version();

         const { route, method } = this.route;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, context };
      },
   );

   private readonly $loading: Signal<boolean> = computed(() => this.$calendar.isLoading());

   public get loading(): boolean {
      return this.$loading();
   }

   public get downloading(): boolean {
      return this.$downloading();
   }

   public get days(): CalendarDay[] | undefined {
      return this.$calendar.hasValue() ? this.$calendar.value() : undefined;
   }

   public open(): void {
      this.$active.set(true);
      this.$version.update((version: number) => version + 1);
   }

   /**
    * Downloads the calendar as an Excel file: the file is requested with the session (a link can't send
    * it) & saved with the day of the download in its name
    */
   public async downloadExcel(): Promise<void> {
      const { route, method } = this.excel;
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

      this.$downloading.set(true);

      try {
         const file: Blob = await firstValueFrom(
            this._http.request(method, `${environment.apiUrl}${route}`, { context, responseType: 'blob' }),
         );

         downloadBlob({ file, name: `calendario-de-pagos-${fileDate()}.xlsx` });
      } catch {
         // the error interceptor already notified the user
      } finally {
         this.$downloading.set(false);
      }
   }
}
