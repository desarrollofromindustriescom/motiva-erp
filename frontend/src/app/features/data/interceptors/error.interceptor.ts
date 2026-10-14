import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SessionService } from '../services/session.service';
import { customHeaders } from '../repository/custom-headers';
import { errCodeTitles, defaultErrTitle } from '../repository/api.repository';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { EpPreview } from '../../../interfaces/api';

export const errorInterceptorFn: HttpInterceptorFn = (
   request: HttpRequest<unknown>,
   handler: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
   const _session: SessionService = inject(SessionService);
   const _translate: TranslateService = inject(TranslateService);

   return handler(request).pipe(
      tap({
         error: (event: HttpEvent<unknown>) => {
            if (!(event instanceof HttpErrorResponse)) return;

            if (event.status === 401) _session.clear();

            if (request.headers.has(customHeaders.ignoreError)) return;

            const preview = event.error as EpPreview | null;
            let text: string | undefined;

            if (preview && typeof preview === 'object' && !preview.success && preview.error) {
               text = preview.error.message;
            }

            Swal.fire({
               text,
               icon: 'error',
               timer: 5000,
               title: _translate.instant(errCodeTitles[event.status] || defaultErrTitle),
            });
         },
      }),
   );
};
