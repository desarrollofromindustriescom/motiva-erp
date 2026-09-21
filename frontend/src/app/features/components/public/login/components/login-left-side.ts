import { Component } from '@angular/core';
import { LoginForm } from './login-form';

@Component({
   selector: 'fi-login-left-side',
   imports: [LoginForm],
   template: `
      <div class="border border-black/30 rounded-xl py-12 px-24 flex flex-col items-start justify-between size-full">
         <div class="flex flex-col">
            <h1 class="text-4xl text-second font-bold">Bienvenido a Crédito Motiva</h1>
            <span class="text-sm text-main ">Plataforma administrativa y acceso de clientes</span>
         </div>

         <fi-login-form class="w-full" />

         <ul
            class="flex flex-col gap-1 [&>li]:flex [&>li]:items-center [&>li]:justify-content [&>li]:gap-2 [&_i]:text-main [&_i]:text-xl [&_span]:text-main"
         >
            @for (contact of contactMedia; track $index) {
               <li>
                  <i [class]="'bx ' + contact.icon"></i>
                  <span>{{ contact.text }}</span>
               </li>
            }
         </ul>
      </div>
   `,
})
export class LoginLeftSide {
   public readonly contactMedia: {
      icon: string;
      text: string;
   }[] = [
      {
         icon: 'bx-envelope-alt',
         text: 'example@gmail.com',
      },
      {
         icon: 'bx-phone',
         text: '772 000 9090',
      },
   ];
}
