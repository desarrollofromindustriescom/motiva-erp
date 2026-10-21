import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PrivateHeaderComponent } from './private-header.component';
import { PrivateFooterComponent } from './private-footer.component';

@Component({
   selector: 'fi-private-main-component',
   imports: [RouterOutlet, PrivateHeaderComponent, PrivateFooterComponent],
   template: `
      <main class="size-full flex flex-col max-h-full overflow-auto gap-2">
         <fi-private-header-component />

         <section class="w-full flex-auto flex flex-col [&>*:nth-child(2)]:flex-auto">
            <router-outlet />
         </section>
         <fi-private-footer-component />
      </main>
   `,
})
export class PrivateMainComponent {}
