import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

export const appConfig: ApplicationConfig = {
   providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(routes),
      providePrimeNG({
         theme: {
            preset: Aura,
            options: {
               darkModeSelector: false || 'none',
            },
         },
         license: '',
      }),
      MessageService,
      DialogService,
      ConfirmationService,
   ],
};
