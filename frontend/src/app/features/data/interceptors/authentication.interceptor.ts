// auth.interceptor.ts
import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionService } from '../services/session.service';

export const authenticationInterceptorFn: HttpInterceptorFn = (
   request: HttpRequest<unknown>,
   handler: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
   const token: string = inject(SessionService).token;

   return handler(
      !token
         ? request
         : request.clone({
              setHeaders: { Authorization: `Bearer ${token}` },
           }),
   );
};
