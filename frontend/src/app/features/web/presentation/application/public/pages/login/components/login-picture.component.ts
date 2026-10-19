import { Component } from '@angular/core';
import { PICTURES, ICONS, ASSETS_DIR } from '../../../../../../../data/repository/assets.repository';

@Component({
   selector: 'fi-login-picture-component',
   template: `
      @let picture = ASSETS_DIR.PICTURES + PICTURES.PICTURE_LOGIN;
      @let logo = ASSETS_DIR.ICONS + ICONS.MOTIVA_LOGO;

      <div class="h-full w-full relative overflow-hidden rounded-xl">
         <img
            [src]="picture"
            class="absolute z-1 w-full h-full object-cover"
         />
         <div class="absolute top-0 left-0 w-full h-full bg-black/30 z-2"></div>
         <div class="z-3 absolute top-1/2 left-1/2 px-4 py-3 bg-white -translate-y-1/2 -translate-x-1/2 rounded-xl">
            <img
               class="h-26"
               [src]="logo"
            />
         </div>
      </div>
   `,
})
export class LoginPictureComponent {
   public readonly ASSETS_DIR = ASSETS_DIR;
   public readonly PICTURES = PICTURES;
   public readonly ICONS = ICONS;
}
