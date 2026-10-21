import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
   selector: 'fi-private-main-component',
   imports: [RouterOutlet],
   template: `
      <main class="size-full flex flex-col max-h-full overflow-auto gap-2">
         <ng-content select="fi-private-header-component" />

         <section class="w-full flex-auto flex flex-col [&>*:nth-child(2)]:flex-auto">
            <router-outlet />
         </section>
         <ng-content select="fi-private-footer-component" />
      </main>
   `,
})
export class PrivateMainComponent {}
