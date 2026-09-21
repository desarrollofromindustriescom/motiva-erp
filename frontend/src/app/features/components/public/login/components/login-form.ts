import { CommonModule } from '@angular/common';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputIconModule } from 'primeng/inputicon';
import { InputPasswordModule } from 'primeng/inputpassword';
import { InputTextModule } from 'primeng/inputtext';
import { LabelModule } from 'primeng/label';

@Component({
   selector: 'fi-login-form',
   imports: [
      IftaLabelModule,
      InputTextModule,
      InputPasswordModule,
      IconFieldModule,
      InputIconModule,
      CommonModule,
      LabelModule,
      ButtonDirective,
      FormsModule,
   ],
   template: `
      @let mask = $mask();

      <form
         class="flex flex-col w-full gap-3"
         (submit)="$event.preventDefault()"
      >
         <h2 class="w-full text-2xl text-second">Inicio de sesión</h2>

         <p-iftalabel class="w-full">
            <input
               pInputText
               id="username"
               name="username"
               type="text"
               autocomplete="off"
               [fluid]="true"
               [(ngModel)]="$username"
            />
            <label for="username">Nombre de usuario</label>
         </p-iftalabel>

         <p-iftalabel class="w-full">
            <p-iconfield>
               <input
                  pInputPassword
                  [fluid]="true"
                  [(mask)]="$mask"
                  [(ngModel)]="$password"
                  name="password"
                  id="password"
               />
               <p-inputicon
                  (click)="$mask.set(!mask)"
                  class="cursor-pointer -translate-y-1/2"
                  [ngClass]="{
                     'bx bx-eye': mask,
                     'bx bx-eye-slash': !mask,
                  }"
               />
            </p-iconfield>
            <label for="password">Contraseña</label>
         </p-iftalabel>

         <button
            pButton
            class="bg-contrast! w-fit px-6! ml-auto"
            (click)="enter()"
            [loading]="$loading()"
         >
            Entrar
         </button>
      </form>
   `,
})
export class LoginForm {
   public $mask: WritableSignal<boolean> = signal(true);
   public $username: WritableSignal<string> = signal('');
   public $password: WritableSignal<string> = signal('');
   public $loading: WritableSignal<boolean> = signal(false);

   private readonly _message: MessageService = inject(MessageService);
   private readonly _router: Router = inject(Router);

   public enter(): void {
      console.log('enter');
      if (this.$username().trim() === '' || this.$password().trim() === '') {
         this._message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Los campos no pueden estar vacios',
         });

         return;
      }

      this.$loading.set(true);
      fetch('https://motiva-erp.onrender.com/api/login', {
         method: 'POST',
         body: JSON.stringify({
            username: this.$username(),
            password: this.$password(),
         }),
         headers: {
            'Content-type': 'application/json',
            'Accept': 'application/json',
         },
      })
         .then((response) => response.json())
         .then((response) => {
            console.log(response);
            if (response.success && response.data && response.data.user && response.data.user.token) {
               cookieStore.set('token', response.data.user.token).then(() => {
                  this._router.navigate(['/', 'dashboard']);
               });
            } else {
               this._message.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Error al validar las credenciales, verifica la información',
               });
            }
         })
         .catch((err) => {
            console.log(err);
            this._message.add({
               severity: 'error',
               summary: 'Error',
               detail: 'Error al validar las credenciales, verifica la información',
            });
         })
         .finally(() => this.$loading.set(false));
   }
}
