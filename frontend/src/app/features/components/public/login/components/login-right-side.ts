import { Component } from '@angular/core';

@Component({
   selector: 'fi-login-right-side',
   imports: [],
   template: `
      <div class="h-full w-full relative overflow-hidden rounded-xl">
         <img
            src="/assets/pictures/65db98e5-af29-4e73-a85e-3903c1ac1d97.webp"
            class="absolute z-1 w-full h-full object-cover"
         />
         <div class="absolute top-0 left-0 w-full h-full bg-black/30 z-2"></div>
         <div class="z-3 absolute top-1/2 left-1/2 px-4 py-3 bg-white -translate-y-1/2 -translate-x-1/2 rounded-xl">
            <img
               src="/assets/icons/logo.svg"
               class="h-26"
            />
         </div>
      </div>
   `,
})
export class LoginRightSide {}
