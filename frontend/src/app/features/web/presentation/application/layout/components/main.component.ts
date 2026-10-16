import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';

@Component({
   selector: 'fi-main-component',
   imports: [RouterOutlet, HeaderComponent, FooterComponent],
   template: `
      <main class="size-full flex flex-col max-h-full overflow-auto gap-2">
         <fi-header-component />
         <section class="w-full flex-auto flex">
            <router-outlet />
         </section>
         <fi-footer-component />
      </main>
   `,
})
export class MainComponent {}
