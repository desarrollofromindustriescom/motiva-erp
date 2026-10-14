import { Component } from '@angular/core';
import { environment } from '../../../../../../../environments/environment.development';
import { pictures, icons } from '../../../../../data/repository/assets.repository';

@Component({
   selector: 'fi-login-picture-component',
   imports: [],
   template: `
      <div class="h-full w-full relative overflow-hidden rounded-xl">
         <img
            [src]="PICTURES_DIR + PICTURE_LOGIN"
            class="absolute z-1 w-full h-full object-cover"
         />
         <div class="absolute top-0 left-0 w-full h-full bg-black/30 z-2"></div>
         <div class="z-3 absolute top-1/2 left-1/2 px-4 py-3 bg-white -translate-y-1/2 -translate-x-1/2 rounded-xl">
            <img
               [src]="ICONS_DIR + MOTIVA_LOGO"
               class="h-26"
            />
         </div>
      </div>
   `,
})
export class LoginPictureComponent {
   public readonly PICTURES_DIR: string = environment.dir.pictures;
   public readonly ICONS_DIR: string = environment.dir.icons;
   public readonly PICTURE_LOGIN: string = pictures.PICTURE_LOGIN;
   public readonly MOTIVA_LOGO: string = icons.MOTIVA_LOGO;
}
