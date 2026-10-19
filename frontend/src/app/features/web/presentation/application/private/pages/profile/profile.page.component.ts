import { Component, computed, inject, Signal } from '@angular/core';
import { SessionService } from '../../../../../../data/services/session.service';
import { Session } from '../../../../../../../interfaces/session';
import { ProfileInfoComponent } from './components/profile-info.component';
import { ProfileSecutiryComponent } from './components/profile-security.component';

@Component({
   selector: 'fi-profile-page-component',
   imports: [ProfileInfoComponent, ProfileSecutiryComponent],
   template: `
      @let session = $session();
      @if (session) {
         <div class="size-full flex flex-col gap-4">
            <fi-profile-info-component [session]="session" />
            <fi-profile-secutiry-component />
         </div>
      }
   `,
})
export class ProfilePageComponent {
   private readonly _session: SessionService = inject(SessionService);

   public readonly $session: Signal<Session | null> = computed(() => this._session.session);
}
