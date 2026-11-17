import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
   selector: 'fi-private-main-component',
   imports: [RouterOutlet],
   template: `
      <main class="flex size-full max-h-full flex-col gap-2 overflow-auto">
         <ng-content select="[header]" />
         <ng-content select="[topSections]" />

         <section class="flex w-full flex-auto flex-col [&>*:nth-child(2)]:flex-auto">
            <router-outlet />
         </section>
         <ng-content select="[footer]" />
      </main>
   `,
})
export class PrivateMainComponent {}
