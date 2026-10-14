import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SessionService } from './features/data/services/session.service';
import { Session } from './interfaces/session';

@Component({
   selector: 'fi-root',
   imports: [RouterOutlet],
   template: ` <router-outlet /> `,
})
export class App {
   private readonly _router: Router = inject(Router);
   private readonly _session: SessionService = inject(SessionService);

   constructor() {
      this._session.init();

      effect(() => {
         const token: string = this._session.token;
         const session: Session | null = this._session.session;

         if (!token && !session) this._router.navigate(['/']);
      });
   }
}
