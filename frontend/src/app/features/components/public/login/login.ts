import { Component } from '@angular/core';
import { LoginLeftSide } from './components/login-left-side';
import { LoginRightSide } from './components/login-right-side';

@Component({
   selector: 'fi-login',
   imports: [LoginLeftSide, LoginRightSide],
   template: `
      <section class="w-full h-dvh flex flex-col items-center justify-start">
         <div class="w-full gap-8 grid grid-cols-2 grid-rows-1 flex-auto px-8 pt-8">
            <fi-login-left-side class="h-full flex" />
            <fi-login-right-side />
         </div>
         <p class="w-full flex items-center justify-center gap-1 text-main h-12">Hecho por <b>FromIndustries</b></p>
      </section>
   `,
})
export class Login {}
