import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SessionService } from '../services/session.service';
import { ERR_CODE_TITLES, DEFAULT_ERR_TITLE, API_CONTEXT } from '../repository/api.repository';
import { TranslateService } from '@ngx-translate/core';
import { EpPreview } from '../../../interfaces/api';
import { DialogsService } from '../services/dialogs.service';

export const errorInterceptorFn: HttpInterceptorFn = (
   request: HttpRequest<unknown>,
   handler: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
   const _session: SessionService = inject(SessionService);
   const _dialogs: DialogsService = inject(DialogsService);
   const _translate: TranslateService = inject(TranslateService);

   return handler(request).pipe(
      tap({
         error: (event: HttpEvent<unknown>) => {
            if (!(event instanceof HttpErrorResponse)) return;

            if (event.status === 401) _session.clear();

            if (request.context.get(API_CONTEXT.IGNORE_ERROR)) return;

            const preview = event.error as EpPreview | null;
            let text: string | undefined;

            if (preview && typeof preview === 'object' && !preview.success && preview.error) {
               text = preview.error.message;
            }

            _dialogs.alert({
               duration: 5000,
               severity: 'error',
               text: text || '',
               title: _translate.instant(ERR_CODE_TITLES[event.status] || DEFAULT_ERR_TITLE),
            });
         },
      }),
   );
};
