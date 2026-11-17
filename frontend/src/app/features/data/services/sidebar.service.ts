import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApplicationModule } from '../../../interfaces/navigation';
import { SidebarSection, SidebarSections, SidebarSelection } from '../../../interfaces/sidebar';
import { APPLICATION_MODULES } from '../repository/navigation.repository';
import { SIDEBAR_OPTIONS, SIDEBAR_SECTIONS } from '../repository/sidebar.repository';
import { USERS_I18N_KEYS } from '../repository/users.repository';
import { NavigationService } from './navigation.service';

/**
 * Centralized definition of the extra sections (actions, filters...) each module shows on the sidebar
 */
@Injectable({ providedIn: 'root' })
export class SidebarService {
   private readonly _navigation: NavigationService = inject(NavigationService);
   private readonly _selection: Subject<SidebarSelection> = new Subject();

   public readonly selection$: Observable<SidebarSelection> = this._selection.asObservable();

   public readonly sections: SidebarSections = {
      [APPLICATION_MODULES.USERS]: [
         {
            id: SIDEBAR_SECTIONS.USERS_ACTIONS,
            title: USERS_I18N_KEYS.ACTIONS_TITLE,
            type: 'dropdown',
            button: { label: USERS_I18N_KEYS.ACTION_NEW_USER, icon: 'bx-grid-circle-plus' },
            options: [
               {
                  id: SIDEBAR_OPTIONS.USERS_ADMINISTRATOR,
                  label: USERS_I18N_KEYS.OPTION_ADMINISTRATOR,
                  icon: 'bx-shield',
                  allowed: { superadmin: true, administrator: true },
               },
               {
                  id: SIDEBAR_OPTIONS.USERS_MANAGER,
                  label: USERS_I18N_KEYS.OPTION_MANAGER,
                  icon: 'bx-briefcase',
                  allowed: { superadmin: true, administrator: true },
               },
               {
                  id: SIDEBAR_OPTIONS.USERS_INVESTOR,
                  label: USERS_I18N_KEYS.OPTION_INVESTOR,
                  icon: 'bx-trending-up',
                  allowed: { superadmin: true, administrator: true, manager: true },
               },
               {
                  id: SIDEBAR_OPTIONS.USERS_BORROWER,
                  label: USERS_I18N_KEYS.OPTION_BORROWER,
                  icon: 'bx-user',
                  allowed: { superadmin: true, administrator: true, manager: true },
               },
            ],
         },
      ],
   };

   /**
    * Sections of a module
    */
   public sectionsOf({ module }: { module: ApplicationModule }): SidebarSection[] {
      return this.sections[module] ?? [];
   }

   /**
    * Notifies the active page that an option was chosen
    */
   public select({ section, option }: { section: string; option: string }): void {
      this._selection.next({ module: this._navigation.currentModule, section, option });
   }
}
