import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { LANGS } from '../repository/i18n.repository';
import { HEADERS } from '../repository/api.repository';

export const languageInterceptorFn: HttpInterceptorFn = (
   request: HttpRequest<unknown>,
   handler: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
   const translate: TranslateService = inject(TranslateService);
   const language: string = translate.getCurrentLang() ?? translate.getFallbackLang() ?? LANGS.ES;

   return handler(
      request.clone({
         setHeaders: { [HEADERS.KEYS.ACCEPT_LANGUAGE]: language },
      }),
   );
};
