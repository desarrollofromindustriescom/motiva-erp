import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { EndpointData } from '../../../interfaces/api';
import { CalendarDay } from '../../../interfaces/loan';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { environment } from '../../../../environments/environment.development';
import { SessionService } from './session.service';

/**
 * Calendar of payments: the active loans grouped by the weekday of their current payment. Data is
 * only requested after `open()` and it's requested again every time it's called.
 */
@Injectable({ providedIn: 'root' })
export class LoansCalendarService {
   private readonly _session: SessionService = inject(SessionService);

   private readonly route: EndpointData = { route: API_ROUTES.LOANSCALENDAR, method: HTTP_METHODS.GET };

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

   public get days(): CalendarDay[] | undefined {
      return this.$calendar.hasValue() ? this.$calendar.value() : undefined;
   }

   public open(): void {
      this.$active.set(true);
      this.$version.update((version: number) => version + 1);
   }
}
