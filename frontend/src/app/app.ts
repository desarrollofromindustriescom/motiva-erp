import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SessionService } from './features/data/services/session.service';
import { Session } from './interfaces/session';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
   selector: 'fi-root',
   imports: [RouterOutlet, ConfirmDialogModule],
   template: `
      <p-confirmdialog />
      <router-outlet />
   `,
})
export class App {
   private readonly _router: Router = inject(Router);
   private readonly _session: SessionService = inject(SessionService);

   constructor() {
      effect(() => {
         const token: string = this._session.token;
         const session: Session | null = this._session.session;
         const initialized: boolean = this._session.initialized;
         const url: string = this._router.url;

         if (!token && !session && initialized && url !== '/') this._router.navigate(['/']);
      });
   }
}
