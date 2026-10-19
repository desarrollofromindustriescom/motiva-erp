import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { authenticationInterceptorFn } from './features/data/interceptors/authentication.interceptor';
import { SessionService } from './features/data/services/session.service';
import { errorInterceptorFn } from './features/data/interceptors/error.interceptor';
import { parseInterceptorFn } from './features/data/interceptors/parse.interceptor';
import { JSON_EXTENSION, LANGS } from './features/data/repository/i18n.repository';
import { ASSETS_DIR } from './features/data/repository/assets.repository';

export const appConfig: ApplicationConfig = {
   providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(routes),
      provideHttpClient(withInterceptors([authenticationInterceptorFn, errorInterceptorFn, parseInterceptorFn])),
      provideTranslateService({
         fallbackLang: LANGS.ES,
         loader: provideTranslateHttpLoader({
            prefix: ASSETS_DIR.I18N,
            suffix: JSON_EXTENSION,
            useHttpBackend: true,
         }),
      }),
      providePrimeNG({
         theme: {
            preset: Aura,
            options: {
               darkModeSelector: false || 'none',
            },
         },
         license: '',
      }),
      SessionService,
      DialogService,
      ConfirmationService,
   ],
};
