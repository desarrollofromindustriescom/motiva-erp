import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { CreatedUser } from '../../../interfaces/user';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';

/**
 * Regenerates the password of a user: asks for confirmation & keeps the new
 * credentials only while the dialog that shows them is open (the password
 * can't be read again). The caller opens that dialog when this returns true.
 */
@Injectable({ providedIn: 'root' })
export class UserPasswordService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   private readonly route: EndpointData = { route: API_ROUTES.REGENERATEPASSWORD, method: HTTP_METHODS.POST };

   private readonly $regenerating: WritableSignal<string | null> = signal(null);
   private readonly $credentials: WritableSignal<CreatedUser | null> = signal(null);

   constructor() {}

   /**
    * Id of the user being regenerated, so its buttons can be disabled
    */
   public get regenerating(): string | null {
      return this.$regenerating();
   }

   public get credentials(): CreatedUser | null {
      return this.$credentials();
   }

   /**
    * Forgets the credentials (when their dialog closes)
    */
   public clear(): void {
      this.$credentials.set(null);
   }

   /**
    * Resolves true when the password was regenerated, false when the user
    * cancelled the confirmation or the request failed
    */
   public async regenerate({ id }: { id: string }): Promise<boolean> {
      if (this.$regenerating()) return false;

      try {
         await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_REGENERATE_PASSWORD });
      } catch {
         return false;
      }

      const { method, route } = this.route;
      // the credentials are shown in their own dialog instead of the success alert
      const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

      this.$regenerating.set(id);
      this._dialogs.loading = true;

      try {
         const created: CreatedUser = await firstValueFrom(
            this._http.request<CreatedUser>(method, `${environment.apiUrl}${route}${id}/password`, { context }),
         );

         this.$credentials.set(created);

         return true;
      } catch {
         // the error interceptor already notifies the user
         return false;
      } finally {
         this.$regenerating.set(null);
         this._dialogs.loading = false;
      }
   }
}
