import { Component, input, InputSignal } from '@angular/core';
import { Session } from '../../../../../../../../interfaces/session';
import { TitleCasePipe } from '@angular/common';
import { ASSETS_DIR, PICTURES } from '../../../../../../../data/repository/assets.repository';
import { TranslatePipe } from '@ngx-translate/core';
import { USER_PROFILE_I18N_KEYS } from '../../../../../../../data/repository/profile.repository';
import { UserProfile } from '../../../../../../../../interfaces/user';

@Component({
   selector: 'fi-profile-info-component',
   imports: [TitleCasePipe, TranslatePipe],
   template: `
      @let session = $session();

      <section class="w-full flex items-center justify-between bg-main px-6 py-8 rounded-2xl">
         <div class="flex flex-col items-start justify-start">
            <span class="font-medium text-white text-2xl">{{ session.fullname | titlecase }}</span>
            <span class="font-medium text-white">@{{ session.username }}</span>
            <span class="font-medium text-main bg-white px-3 py-1.5 rounded-lg mt-4">
               {{ USER_PROFILE_I18N[session.profile] | translate }}
            </span>
         </div>

         <div class="rounded-full bg-white p-1 size-32 flex">
            <img
               class="size-full"
               [src]="PICTURES_DIR + PROFILE_DECORATION"
            />
         </div>
      </section>
   `,
})
export class ProfileInfoComponent {
   public $session: InputSignal<Session> = input.required<Session>({ alias: 'session' });

   public readonly PICTURES_DIR: string = ASSETS_DIR.PICTURES;
   public readonly PROFILE_DECORATION: string = PICTURES.PROFILE_DECORATION;
   public readonly USER_PROFILE_I18N: Record<UserProfile, string> = USER_PROFILE_I18N_KEYS;
}
