import { Component, computed, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PrivateSidebarComponent } from './components/private-sidebar.component';
import { PrivateMainComponent } from './components/private-main.component';
import { NavigationService } from '../../../../../data/services/navigation.service';
import { APPLICATION_MODULES, PATHS } from '../../../../../data/repository/navigation.repository';
import { ApplicationModule, NavigationRoute } from '../../../../../../interfaces/navigation';
import { PrivateHeaderComponent } from './components/private-header.component';
import { PrivateFooterComponent } from './components/private-footer.component';
import { UsersService } from '../../../../../data/services/users.service';
import { SidebarService } from '../../../../../data/services/sidebar.service';
import { SidebarSection } from '../../../../../../interfaces/sidebar';
import { PrivateSectionsComponent } from './components/private-sections.component';
import { NgClass } from '@angular/common';

@Component({
   selector: 'fi-private-layout-component',
   imports: [
      PrivateSidebarComponent,
      PrivateMainComponent,
      PrivateHeaderComponent,
      PrivateFooterComponent,
      PrivateSectionsComponent,
      NgClass,
   ],
   template: `
      @let sidebarOpen = $sidebarOpen();
      @let currentModule = $currentModule();
      @let sections = $sections();

      <section class="flex h-dvh w-full bg-white">
         <fi-private-sidebar-component
            class="fixed top-0 z-50 flex h-full w-full flex-col bg-white p-3 transition-all sm:p-4 xl:static xl:z-auto xl:w-xs xl:pr-2"
            [navModules]="navModules"
            [currentModule]="currentModule"
            (navigate)="handleNavigate($event)"
            (close)="handleToggleSidebar({ open: false })"
            [sections]="sections"
            (choose)="handleSelect($event)"
            (logout)="handleLogout()"
            [ngClass]="{
               'left-0': sidebarOpen,
               '-left-full xl:left-0': !sidebarOpen,
            }"
         />
         <fi-private-main-component class="flex h-full min-w-0 flex-auto flex-col p-3 sm:p-4 xl:pl-2">
            <fi-private-header-component
               header
               [currentModule]="currentModule"
               [navModulesBuffer]="navModulesBuffer"
               (toggleSidebar)="handleToggleSidebar({ open: !sidebarOpen })"
            />
            <fi-private-sections-component
               topSections
               class="flex flex-col gap-2 xl:hidden"
               [sections]="sections"
               (choose)="handleSelect($event)"
            />
            <fi-private-footer-component footer />
         </fi-private-main-component>
      </section>
   `,
})
export class PrivateLayoutComponent {
   private readonly _router: Router = inject(Router);
   private readonly _users: UsersService = inject(UsersService);
   private readonly _navigation: NavigationService = inject(NavigationService);
   private readonly _sidebar: SidebarService = inject(SidebarService);

   private readonly $navigationEnd: Signal<NavigationEnd | null> = toSignal(
      this._router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)),
      { initialValue: null },
   );

   public readonly navModules: NavigationRoute[] = this._navigation.navModules;
   public readonly navModulesBuffer: Record<ApplicationModule, NavigationRoute> = this._navigation.navModulesBuffer;
   public readonly $sidebarOpen: Signal<boolean> = computed(() => this._navigation.sidebarOpen);
   public readonly $sections: Signal<SidebarSection[]> = computed(() =>
      this._sidebar.sectionsOf({ module: this._navigation.currentModule }),
   );
   public readonly $currentModule: Signal<ApplicationModule> = computed(() => this._navigation.currentModule);

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

   public handleNavigate(params: { module: ApplicationModule }): void {
      this._navigation.sidebarOpen = false;
      this._navigation.updateModule(params);
   }

   public handleToggleSidebar({ open }: { open: boolean }): void {
      this._navigation.sidebarOpen = open;
   }

   public handleSelect(params: { section: string; option: string }): void {
      this._sidebar.select(params);
   }

   public handleLogout(): void {
      this._navigation.sidebarOpen = false;
      this._users.logout();
   }
}
