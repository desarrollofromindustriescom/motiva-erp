import { Component, computed, inject, Signal } from '@angular/core';
import { SessionService } from '../../../../../../data/services/session.service';
import { Session } from '../../../../../../../interfaces/session';
import { ProfileInfoComponent } from './components/profile-info.component';
import { ProfileSecutiryComponent } from './components/profile-security.component';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { ChangePasswordDialogComponent } from '../../../../common/dialogs/views/change-password/change-password.dialog.component';

@Component({
   selector: 'fi-profile-page-component',
   imports: [ProfileInfoComponent, ProfileSecutiryComponent],
   template: `
      @let session = $session();
      @if (session) {
         <div class="size-full flex flex-col gap-4">
            <fi-profile-info-component [session]="session" />
            <fi-profile-secutiry-component (changePassword)="handleChangePassword()" />
         </div>
      }
   `,
})
export class ProfilePageComponent {
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly $session: Signal<Session | null> = computed(() => this._session.session);

   constructor() {}

   public handleChangePassword(): void {
      this._dialogs.newDialog({
         title: DIALOG_I18N_KEYS.CHANGE_PASSWORD_TITLE,
         component: ChangePasswordDialogComponent,
      });
   }
}
