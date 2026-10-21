// auth.interceptor.ts
import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionService } from '../services/session.service';
import { HEADERS } from '../repository/api.repository';

export const authenticationInterceptorFn: HttpInterceptorFn = (
   request: HttpRequest<unknown>,
   handler: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
   const token: string = inject(SessionService).token;

   return handler(
      !token
         ? request
         : request.clone({
              setHeaders: { [HEADERS.KEYS.AUTHORIZATION]: `${HEADERS.VALUES.AUTHORIZATION} ${token}` },
           }),
   );
};
