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

         <section
            class="w-full flex-auto flex flex-col [&>*:nth-child(2)]:flex-auto border rounded-2xl border-slate-500"
         >
            <router-outlet />
            <fi-footer-component />
         </section>
      </main>
   `,
})
export class MainComponent {}
