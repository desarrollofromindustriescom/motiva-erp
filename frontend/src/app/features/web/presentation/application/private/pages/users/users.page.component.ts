import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { SidebarSelection } from '../../../../../../../interfaces/sidebar';
import { CreatableProfile, EditableProfile, UserRow } from '../../../../../../../interfaces/user';
import { APPLICATION_MODULES } from '../../../../../../data/repository/navigation.repository';
import {
   DIALOG_I18N_KEYS,
   USER_DETAIL_TITLES,
   USER_EDIT_TITLES,
} from '../../../../../../data/repository/dialog.repository';
import { SIDEBAR_OPTIONS, SIDEBAR_SECTIONS } from '../../../../../../data/repository/sidebar.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { SidebarService } from '../../../../../../data/services/sidebar.service';
import { InvestorBalanceService } from '../../../../../../data/services/investor-balance.service';
import { UserPasswordService } from '../../../../../../data/services/user-password.service';
import { UserEditService } from '../../../../../../data/services/user-edit.service';
import { UserDetailService } from '../../../../../../data/services/user-detail.service';
import { UserCreationService } from '../../../../../../data/services/user-creation.service';
import { UsersTableComponent } from './components/users-table.component';
import { UsersListService } from '../../../../../../data/services/users-list.service';
import { SidebarFiltersEvent } from '../../../../../../../interfaces/sidebar';
import { InvestorBalanceDialogComponent } from '../../../../common/dialogs/views/investments/investor-balance.dialog.component';
import { UserPasswordDialogComponent } from '../../../../common/dialogs/views/users/user-password.dialog.component';
import { UserEditDialogComponent } from '../../../../common/dialogs/views/users/user-edit.dialog.component';
import { UserDetailDialogComponent } from '../../../../common/dialogs/views/users/user-detail.dialog.component';
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
   imports: [UsersTableComponent],
   host: { class: 'flex flex-col' },
   template: `<fi-users-table-component
      class="flex flex-auto flex-col"
      (details)="handleDetails({ user: $event })"
      (edit)="handleEdit({ user: $event })"
      (password)="handlePassword({ user: $event })"
      (wallet)="handleBalance({ user: $event })"
   />`,
})
export class UsersPageComponent {
   private readonly _sidebar: SidebarService = inject(SidebarService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _creation: UserCreationService = inject(UserCreationService);
   private readonly _list: UsersListService = inject(UsersListService);
   private readonly _detail: UserDetailService = inject(UserDetailService);
   private readonly _edit: UserEditService = inject(UserEditService);
   private readonly _password: UserPasswordService = inject(UserPasswordService);
   private readonly _balance: InvestorBalanceService = inject(InvestorBalanceService);

   constructor() {
      // filters are never active when entering the page
      this._sidebar.resetFilters();
      this._list.enter();

      this._sidebar.filters$
         .pipe(
            filter(
               ({ module, section }: SidebarFiltersEvent) =>
                  module === APPLICATION_MODULES.USERS && section === SIDEBAR_SECTIONS.USERS_FILTERS,
            ),
            takeUntilDestroyed(),
         )
         .subscribe(({ values }: SidebarFiltersEvent) => this._list.applyFilters({ values }));

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

   public handleDetails({ user }: { user: UserRow }): void {
      this._detail.open({ id: user.id });
      this._dialogs.newDialog({
         title: USER_DETAIL_TITLES[user.profile],
         component: UserDetailDialogComponent,
         size: 'sm',
      });
   }

   public handleEdit({ user }: { user: UserRow }): void {
      this._edit.start({ id: user.id, profile: user.profile as EditableProfile });
      this._dialogs.newDialog({
         title: USER_EDIT_TITLES[user.profile],
         component: UserEditDialogComponent,
         size: 'lg',
      });
   }

   public handlePassword({ user }: { user: UserRow }): void {
      this._password.regenerate({ id: user.id }).then((done: boolean) => {
         if (!done) return;

         this._dialogs.newDialog({
            title: DIALOG_I18N_KEYS.USER_PASSWORD_TITLE,
            component: UserPasswordDialogComponent,
            size: 'sm',
         });
      });
   }

   public handleBalance({ user }: { user: UserRow }): void {
      this._balance.open({ id: user.id });
      // the dialog has no title, the name of the investor is part of its content
      this._dialogs.newDialog({ title: '', component: InvestorBalanceDialogComponent, size: 'lg' });
   }
}
