import { Component, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from './components/sidebar.component';
import { MainComponent } from './components/main.component';
import { NavigationService } from '../../../../data/services/navigation.service';
import { APPLICATION_MODULES, PATHS } from '../../../../data/repository/navigation.repository';
import { ApplicationModule } from '../../../../../interfaces/navigation';

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
export class LayoutComponent {
   private readonly _router: Router = inject(Router);
   private readonly _navigation: NavigationService = inject(NavigationService);

   private readonly $navigationEnd: Signal<NavigationEnd | null> = toSignal(
      this._router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)),
      { initialValue: null },
   );

   constructor() {
      effect((): void => {
         const event: NavigationEnd | null = this.$navigationEnd();

         if (!event) return;

         const [path] = event.urlAfterRedirects.split(/[?#]/);
         const segments: string[] = path.split('/').filter((item: string) => item !== '');
         const segment: string = segments.length > 1 ? segments[1] : PATHS.ROOT_RELATIVE;

         let module: ApplicationModule = APPLICATION_MODULES.HOME;

         if (this._navigation.navRoutesBuffer[segment]) module = this._navigation.navRoutesBuffer[segment];
         if (module !== this._navigation.currentModule) this._navigation.updateModule({ module });
      });
   }
}
