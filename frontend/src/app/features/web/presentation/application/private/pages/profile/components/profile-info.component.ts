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

      <section
         class="bg-main flex w-full flex-col-reverse items-center gap-4 rounded-2xl px-4 py-6 sm:flex-row sm:justify-between sm:px-6 sm:py-8"
      >
         <div class="flex w-full min-w-0 flex-col items-center justify-start text-center sm:items-start sm:text-left">
            <span class="text-xl font-medium wrap-anywhere text-white sm:text-2xl">{{
               session.fullname | titlecase
            }}</span>
            <span class="font-medium text-white">@{{ session.username }}</span>
            <span class="text-main mt-3 rounded-lg bg-white px-3 py-1.5 font-medium sm:mt-4">
               {{ USER_PROFILE_I18N[session.profile] | translate }}
            </span>
         </div>

         <div class="flex size-24 shrink-0 rounded-full bg-white p-1 sm:size-32">
            <img
               class="size-full"
               [src]="PICTURES_DIR + PROFILE_DECORATION"
            />
         </div>
      </section>
   `,
})
export class ProfileInfoComponent {
   public readonly PICTURES_DIR: string = ASSETS_DIR.PICTURES;
   public readonly PROFILE_DECORATION: string = PICTURES.PROFILE_DECORATION;
   public readonly USER_PROFILE_I18N: Record<UserProfile, string> = USER_PROFILE_I18N_KEYS;

   public $session: InputSignal<Session> = input.required<Session>({ alias: 'session' });
}
