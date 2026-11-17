import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { SidebarSelection } from '../../../../../../../interfaces/sidebar';
import { CreatableProfile } from '../../../../../../../interfaces/user';
import { APPLICATION_MODULES } from '../../../../../../data/repository/navigation.repository';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { SIDEBAR_OPTIONS, SIDEBAR_SECTIONS } from '../../../../../../data/repository/sidebar.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { SidebarService } from '../../../../../../data/services/sidebar.service';
import { UserCreationService } from '../../../../../../data/services/user-creation.service';
import { UserCreateDialogComponent } from '../../../../common/dialogs/views/users/user-create.dialog.component';

const NEW_USER_OPTIONS: Record<string, { profile: CreatableProfile; title: string }> = {
   [SIDEBAR_OPTIONS.USERS_ADMINISTRATOR]: {
      profile: 'administrator',
      title: DIALOG_I18N_KEYS.NEW_ADMINISTRATOR_TITLE,
   },
   [SIDEBAR_OPTIONS.USERS_MANAGER]: { profile: 'manager', title: DIALOG_I18N_KEYS.NEW_MANAGER_TITLE },
   [SIDEBAR_OPTIONS.USERS_INVESTOR]: { profile: 'investor', title: DIALOG_I18N_KEYS.NEW_INVESTOR_TITLE },
   [SIDEBAR_OPTIONS.USERS_BORROWER]: { profile: 'borrower', title: DIALOG_I18N_KEYS.NEW_BORROWER_TITLE },
};

@Component({
   selector: 'fi-users-page-component',
   template: ``,
})
export class UsersPageComponent {
   private readonly _sidebar: SidebarService = inject(SidebarService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _creation: UserCreationService = inject(UserCreationService);

   constructor() {
      this._sidebar.selection$
         .pipe(
            filter(
               ({ module, section }: SidebarSelection) =>
                  module === APPLICATION_MODULES.USERS && section === SIDEBAR_SECTIONS.USERS_ACTIONS,
            ),
            takeUntilDestroyed(),
         )
         .subscribe(({ option }: SidebarSelection) => this.handleNewUser({ option }));
   }

   public handleNewUser({ option }: { option: string }): void {
      const config = NEW_USER_OPTIONS[option];

      if (!config) return;

      this._creation.start({ profile: config.profile });
      this._dialogs.newDialog({ title: config.title, component: UserCreateDialogComponent, size: 'lg' });
   }
}
