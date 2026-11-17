import { Component, input, InputSignal, signal, WritableSignal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputTextModule } from 'primeng/inputtext';
import { CreatedUser } from '../../../../../../interfaces/user';
import { USERS_I18N_KEYS } from '../../../../../data/repository/users.repository';

type CopyKey = 'username' | 'password';

/**
 * Generated username & password: read only inputs that can be
 * copied once the credentials exist
 */
@Component({
   selector: 'fi-user-credentials-component',
   imports: [TranslatePipe, IftaLabelModule, InputTextModule],
   template: `
      @let credentials = $credentials();

      <div class="flex w-full flex-col gap-2">
         @for (item of fields; track item.key) {
            <div class="relative w-full">
               <p-iftalabel class="w-full">
                  <input
                     pInputText
                     class="w-full bg-slate-200! pr-12!"
                     readonly
                     tabindex="-1"
                     [id]="item.key"
                     [value]="credentials ? credentials[item.key] : ''"
                  />
                  <label [for]="item.key">{{ item.label | translate }}</label>
               </p-iftalabel>

               <button
                  class="text-second absolute top-1/2 right-3 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg p-1.5 transition-all hover:bg-slate-300 disabled:cursor-auto disabled:opacity-40 disabled:hover:bg-transparent"
                  type="button"
                  [disabled]="!credentials"
                  (click)="handleCopy({ key: item.key })"
               >
                  <i [class]="'bx text-xl ' + ($copied() === item.key ? 'bx-check' : 'bx-copy')"></i>
               </button>
            </div>
         }
      </div>
   `,
})
export class UserCredentialsComponent {
   public readonly fields: { key: CopyKey; label: string }[] = [
      { key: 'username', label: USERS_I18N_KEYS.FIELD_USERNAME },
      { key: 'password', label: USERS_I18N_KEYS.FIELD_PASSWORD },
   ];

   public $credentials: InputSignal<CreatedUser | null> = input<CreatedUser | null>(null, { alias: 'credentials' });
   public readonly $copied: WritableSignal<CopyKey | null> = signal(null);

   /**
    * Copies one credential & shows a check for a moment
    */
   public handleCopy({ key }: { key: CopyKey }): void {
      const credentials: CreatedUser | null = this.$credentials();

      if (!credentials) return;

      navigator.clipboard
         .writeText(credentials[key])
         .then(() => {
            this.$copied.set(key);
            setTimeout(
               () => this.$copied.update((current: CopyKey | null) => (current === key ? null : current)),
               1500,
            );
         })
         .catch(() => undefined);
   }
}
