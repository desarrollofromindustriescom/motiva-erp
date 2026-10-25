import { Component, computed, inject, Signal } from '@angular/core';
import { SessionService } from '../../../../../../data/services/session.service';
import { Session } from '../../../../../../../interfaces/session';
import { ProfileInfoComponent } from './components/profile-info.component';
import { ProfileSessionsComponent } from './components/profile-sessions.component';
import { ProfileSecutiryComponent } from './components/profile-security.component';
import { UsersService } from '../../../../../../data/services/users.service';
import { ActiveSession } from '../../../../../../../interfaces/user';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { ChangePasswordDialogComponent } from '../../../../common/dialogs/views/change-password/change-password.dialog.component';

@Component({
   selector: 'fi-profile-page-component',
   imports: [ProfileInfoComponent, ProfileSecutiryComponent, ProfileSessionsComponent],
   template: `
      @let loading = $loading();
      @let session = $session();
      @let activeSessions = $activeSessions();
      @if (session) {
         <div class="size-full flex flex-col gap-4">
            <fi-profile-info-component [session]="session" />
            <fi-profile-secutiry-component (changePassword)="handleChangePassword()" />
            <fi-profile-sessions-component
               [loading]="loading"
               [sessions]="activeSessions"
               (close)="handleCloseSession($event)"
               (closeAll)="handleCloseAllSessions()"
            />
         </div>
      }
   `,
})
export class ProfilePageComponent {
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _users: UsersService = inject(UsersService);

   public readonly $loading: Signal<boolean> = computed(() => this._users.loading);
   public readonly $session: Signal<Session | null> = computed(() => this._session.session);
   public readonly $activeSessions: Signal<ActiveSession[]> = computed(() => this._users.activeSessions);

   constructor() {
      this._users.activeSessionsReload();
   }

   public handleCloseSession(params: { sessionID: string }): void {
      this._users.revokeSession(params);
   }

   public handleCloseAllSessions(): void {
      this._users.revokeSessions();
   }

   public handleChangePassword(): void {
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.CHANGE_PASSWORD_TITLE,
         component: ChangePasswordDialogComponent,
      });
   }
}
