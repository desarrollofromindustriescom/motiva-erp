import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, output, OutputEmitterRef, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { UserActionId, UserRow, UsersOrder } from '../../../../../../../../interfaces/user';
import { UserPasswordService } from '../../../../../../../data/services/user-password.service';
import { UserDeletionService } from '../../../../../../../data/services/user-deletion.service';
import { UsersListService } from '../../../../../../../data/services/users-list.service';
import {
   USERS_ACTION_RULES,
   USERS_ACTION_TOOLTIPS,
   USERS_I18N_KEYS,
   USERS_ROLE_COLORS,
   USERS_ROLE_I18N_KEYS,
   USERS_STATUS_COLORS,
} from '../../../../../../../data/repository/users.repository';

interface RowAction {
   id: UserActionId;
   danger?: boolean;
}

@Component({
   selector: 'fi-users-table-component',
   imports: [NgTemplateOutlet, TranslatePipe, TableModule, PaginatorModule],
   template: `
      @let users = $users();
      @let loading = $loading();
      @let order = $order();

      <ng-template
         #rowActions
         let-user
      >
         <div
            class="flex flex-wrap items-center gap-1 max-2xl:w-0 max-2xl:min-w-full 2xl:ml-auto 2xl:max-w-md 2xl:justify-end"
         >
            @for (action of actions; track action.id) {
               <button
                  class="flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1 text-sm text-white transition-all disabled:cursor-auto disabled:bg-slate-300 2xl:whitespace-nowrap"
                  type="button"
                  [class]="
                     action.danger
                        ? 'bg-red-500 hover:bg-red-600 focus:bg-red-600'
                        : 'bg-second hover:bg-second-light focus:bg-second-light'
                  "
                  [disabled]="!enabled({ action, user })"
                  (click)="handleAction({ action, user })"
               >
                  {{ TOOLTIPS[action.id] | translate }}
               </button>
            }
         </div>
      </ng-template>

      <section class="flex w-full flex-auto flex-col gap-2 rounded-2xl border border-slate-500 p-3 sm:p-4">
         <div class="w-full flex-auto overflow-x-auto">
            <p-table
               class="block w-full max-sm:[&_td]:px-2! max-sm:[&_th]:px-2!"
               [value]="users"
               [loading]="loading"
            >
               <ng-template #header>
                  <tr>
                     <th>
                        <button
                           class="flex cursor-pointer items-center gap-1 font-[inherit]"
                           type="button"
                           (click)="handleOrder()"
                        >
                           {{ I18N.HEAD_CURP | translate }}
                           <i
                              class="bx text-lg"
                              [class.text-main]="order !== ''"
                              [class.bx-arrow-up-down]="order === ''"
                              [class.bx-arrow-up-narrow-wide]="order === 'asc'"
                              [class.bx-arrow-down-wide-narrow]="order === 'desc'"
                           ></i>
                        </button>
                     </th>
                     <th class="max-lg:hidden">{{ I18N.HEAD_USERNAME | translate }}</th>
                     <th>{{ I18N.HEAD_FULLNAME | translate }}</th>
                     <th class="max-lg:hidden">{{ I18N.HEAD_STATUS | translate }}</th>
                     <th class="max-sm:hidden">{{ I18N.HEAD_PROFILE | translate }}</th>
                     <th class="max-2xl:hidden"></th>
                  </tr>
               </ng-template>
               <ng-template
                  #body
                  let-user
               >
                  <tr class="max-2xl:[&>td]:border-b-0!">
                     <td class="max-sm:text-xs max-sm:break-all 2xl:whitespace-nowrap">{{ user.curp || '-' }}</td>
                     <td class="max-lg:hidden">{{ user.username }}</td>
                     <td>{{ user.fullname }}</td>
                     <td class="max-lg:hidden">
                        <span
                           class="rounded px-2 py-0.5 text-sm whitespace-nowrap text-white lowercase"
                           [class]="STATUS_COLORS[user.status.slug] || 'bg-slate-500'"
                           >{{ user.status.title }}</span
                        >
                     </td>
                     <td class="max-sm:hidden">
                        <span
                           class="rounded px-2 py-0.5 text-sm whitespace-nowrap text-white"
                           [class]="ROLE_COLORS[user.profile]"
                           >{{ ROLE_I18N[user.profile] | translate }}</span
                        >
                     </td>
                     <td class="max-2xl:hidden">
                        <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: user }" />
                     </td>
                  </tr>
                  <tr class="2xl:hidden">
                     <td
                        colspan="6"
                        class="pt-0!"
                     >
                        <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: user }" />
                     </td>
                  </tr>
               </ng-template>
               <ng-template #emptymessage>
                  <tr>
                     <td
                        class="py-6 text-center"
                        colspan="6"
                     >
                        {{ loading ? '' : (I18N.EMPTY | translate) }}
                     </td>
                  </tr>
               </ng-template>
            </p-table>
         </div>

         @if ($total() > $size) {
            <p-paginator
               class="w-full"
               [first]="($page() - 1) * $size"
               [rows]="$size"
               [totalRecords]="$total()"
               [showFirstLastIcon]="true"
               [pageLinkSize]="3"
               (onPageChange)="handlePage($event)"
            />
         }
      </section>
   `,
})
export class UsersTableComponent {
   private readonly _list: UsersListService = inject(UsersListService);
   private readonly _deletion: UserDeletionService = inject(UserDeletionService);
   private readonly _password: UserPasswordService = inject(UserPasswordService);

   public readonly I18N = USERS_I18N_KEYS;
   public readonly ROLE_I18N: Record<string, string> = USERS_ROLE_I18N_KEYS;
   public readonly ROLE_COLORS: Record<string, string> = USERS_ROLE_COLORS;
   public readonly STATUS_COLORS: Record<string, string> = USERS_STATUS_COLORS;
   public readonly TOOLTIPS: Record<UserActionId, string> = USERS_ACTION_TOOLTIPS;
   public readonly $size: number = this._list.size;

   // availability follows the profile & status of every row (USERS_ACTION_RULES)
   public readonly actions: RowAction[] = [
      { id: 'details' },
      { id: 'documents' },
      { id: 'wallet' },
      { id: 'password' },
      { id: 'edit' },
      { id: 'delete', danger: true },
   ];

   public $details: OutputEmitterRef<UserRow> = output({ alias: 'details' });
   public $edit: OutputEmitterRef<UserRow> = output({ alias: 'edit' });
   public $password: OutputEmitterRef<UserRow> = output({ alias: 'password' });
   public $wallet: OutputEmitterRef<UserRow> = output({ alias: 'wallet' });
   public $documents: OutputEmitterRef<UserRow> = output({ alias: 'documents' });

   public readonly $users: Signal<UserRow[]> = computed(() => this._list.users);
   public readonly $total: Signal<number> = computed(() => this._list.total);
   public readonly $page: Signal<number> = computed(() => this._list.page);
   public readonly $loading: Signal<boolean> = computed(() => this._list.loading);
   public readonly $order: Signal<UsersOrder> = computed(() => this._list.order);

   public enabled({ action, user }: { action: RowAction; user: UserRow }): boolean {
      // a user being deleted can't be used until the request ends
      return (
         USERS_ACTION_RULES[action.id](user) &&
         this._deletion.deleting !== user.id &&
         this._password.regenerating !== user.id
      );
   }

   public handleAction({ action, user }: { action: RowAction; user: UserRow }): void {
      if (action.id === 'details') this.$details.emit(user);
      if (action.id === 'edit') this.$edit.emit(user);
      if (action.id === 'password') this.$password.emit(user);
      if (action.id === 'wallet') this.$wallet.emit(user);
      if (action.id === 'documents') this.$documents.emit(user);
      if (action.id === 'delete') this._deletion.delete({ id: user.id });
   }

   public handlePage(event: PaginatorState): void {
      this._list.changePage({ page: (event.page ?? 0) + 1 });
   }

   public handleOrder(): void {
      this._list.toggleOrder();
   }
}
