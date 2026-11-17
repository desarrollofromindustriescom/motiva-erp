import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { environment } from '../../../../environments/environment.development';
import { DialogsService } from './dialogs.service';
import { UsersListService } from './users-list.service';

/**
 * Deletes a user from the users table or from its detail dialog: asks for
 * confirmation, closes the open dialogs & refreshes the table afterwards
 */
@Injectable({ providedIn: 'root' })
export class UserDeletionService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _list: UsersListService = inject(UsersListService);

   private readonly route: EndpointData = { route: API_ROUTES.DELETEUSER, method: HTTP_METHODS.DELETE };

   private readonly $deleting: WritableSignal<string | null> = signal(null);

   constructor() {}

   /**
    * Id of the user being deleted, so its buttons can be disabled
    */
   public get deleting(): string | null {
      return this.$deleting();
   }

   public async delete({ id }: { id: string }): Promise<void> {
      if (this.$deleting()) return;

      try {
         await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_DELETE_USER });
      } catch {
         return;
      }

      const { method, route } = this.route;

      this.$deleting.set(id);
      this._dialogs.loading = true;

      try {
         await firstValueFrom(this._http.request(method, `${environment.apiUrl}${route}${id}`));

         this._dialogs.closeDialogs();
         this._list.reloadAfterRemoval();
      } catch {
         // the error interceptor already notifies the user
      } finally {
         this.$deleting.set(null);
         this._dialogs.loading = false;
      }
   }
}
