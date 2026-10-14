import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Material from '@primeuix/themes/material';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

export const appConfig: ApplicationConfig = {
   providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(routes),
      provideHttpClient(),
      provideTranslateService({
         fallbackLang: 'es',
         loader: provideTranslateHttpLoader({
            prefix: '/assets/i18n/',
            suffix: '.json',
         }),
      }),
      providePrimeNG({
         theme: {
            preset: Material,
            options: {
               darkModeSelector: false || 'none',
            },
         },
         license: '',
      }),
      DialogService,
      ConfirmationService,
   ],
};
