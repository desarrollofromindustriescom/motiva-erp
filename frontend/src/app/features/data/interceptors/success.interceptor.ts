import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_CONTEXT, DEFAULT_SUCCESS_MESSAGE, DEFAULT_SUCCESS_TITLE } from '../repository/api.repository';
import { DialogsService } from '../services/dialogs.service';

export const successInterceptorFn: HttpInterceptorFn = (
   request: HttpRequest<unknown>,
   handler: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
   const _dialogs: DialogsService = inject(DialogsService);

   return handler(request).pipe(
      tap({
         next: (event: HttpEvent<unknown>) => {
            if (!(event instanceof HttpResponse) || event.status < 200 || event.status >= 300) return;

            if (request.context.get(API_CONTEXT.IGNORE_SUCCESS)) return;

            _dialogs.alert({
               duration: 2000,
               severity: 'success',
               text: DEFAULT_SUCCESS_MESSAGE,
               title: DEFAULT_SUCCESS_TITLE,
            });
         },
      }),
   );
};
