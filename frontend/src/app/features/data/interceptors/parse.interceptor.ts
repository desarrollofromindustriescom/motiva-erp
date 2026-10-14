import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { EpPreview } from '../../../interfaces/api';

export const parseInterceptorFn: HttpInterceptorFn = (
   request: HttpRequest<unknown>,
   handler: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
   return handler(request).pipe(
      map((event: HttpEvent<unknown>) => {
         if (!(event instanceof HttpResponse) || event.status < 200 || event.status >= 300) return event;

         const body = event.body as EpPreview | null;

         if (!body || typeof body !== 'object' || !body.success || !('data' in body)) return event;

         return event.clone({ body: body.data });
      }),
   );
};
