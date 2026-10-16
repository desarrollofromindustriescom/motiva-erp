import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar.component';
import { MainComponent } from './components/main.component';

@Component({
   selector: 'fi-layout-component',
   imports: [SidebarComponent, MainComponent],
   template: `
      <section class="w-full h-dvh flex bg-white">
         <fi-sidebar-component class="w-xs h-full flex flex-col py-4 pl-4 pr-2" />
         <fi-main-component class="flex-auto h-full flex flex-col py-4 pr-4 pl-2" />
      </section>
   `,
})
export class LayoutComponent {}
