import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EditableProfile, UserActionId, UserDetail } from '../../../../../../../interfaces/user';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { UserPasswordService } from '../../../../../../data/services/user-password.service';
import { UserEditService } from '../../../../../../data/services/user-edit.service';
import { UserDeletionService } from '../../../../../../data/services/user-deletion.service';
import { UserDetailService } from '../../../../../../data/services/user-detail.service';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { DIALOG_I18N_KEYS, USER_EDIT_TITLES } from '../../../../../../data/repository/dialog.repository';
import { USERS_ACTION_RULES, USERS_I18N_KEYS } from '../../../../../../data/repository/users.repository';
import { UserEditDialogComponent } from './user-edit.dialog.component';
import { UserPasswordDialogComponent } from './user-password.dialog.component';
import { PhoneFormatPipe } from '../../../../../utilities/pipes/phone-format.pipe';

interface DetailRow {
   label: string;
   value: string | null;
}

interface DetailAction {
   id: UserActionId;
   icon: string;
   label: string;
   danger?: boolean;
}

const ACTIONS: DetailAction[] = [
   { id: 'password', icon: 'bx-lock-open', label: USERS_I18N_KEYS.BUTTON_REGENERATE },
   { id: 'wallet', icon: 'bx-wallet', label: USERS_I18N_KEYS.BUTTON_WALLET },
   { id: 'edit', icon: 'bx-pencil', label: FORMS_I18N_KEYS.BUTTON_EDIT },
   { id: 'delete', icon: 'bx-trash', label: USERS_I18N_KEYS.BUTTON_DELETE, danger: true },
];

/**
 * Detail of any user: it only shows the data that belongs to its profile
 * and, for borrowers, whether the guarantee data was saved or not
 */
@Component({
   selector: 'fi-user-detail-dialog-component',
   imports: [TranslatePipe],
   template: `
      @let user = $user();

      @if (user) {
         <div class="flex w-full flex-col gap-5">
            <dl class="flex w-full flex-col">
               @for (row of $rows(); track row.label) {
                  <div
                     class="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-slate-300 px-1 py-1.5 text-sm sm:grid-cols-[8rem_1fr]"
                  >
                     <dt class="text-second">{{ row.label | translate }}:</dt>
                     <dd class="text-second/70 wrap-anywhere">{{ row.value || '-' }}</dd>
                  </div>
               }
            </dl>

            @if (user.profile === 'investor') {
               <div class="flex w-full flex-col gap-1">
                  <h3 class="text-second text-sm font-medium">{{ I18N.SECTION_BANK | translate }}</h3>
                  <dl class="flex w-full flex-col">
                     @for (row of $bankRows(); track row.label) {
                        <div
                           class="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-slate-300 px-1 py-1.5 text-sm sm:grid-cols-[8rem_1fr]"
                        >
                           <dt class="text-second">{{ row.label | translate }}:</dt>
                           <dd class="text-second/70 wrap-anywhere">{{ row.value || '-' }}</dd>
                        </div>
                     }
                  </dl>
               </div>
            }

            @if (user.profile === 'borrower') {
               <div class="flex w-full flex-col gap-1">
                  <div class="flex w-full items-center gap-2">
                     <h3 class="text-second text-sm font-medium">{{ I18N.DETAIL_SECTION_GUARANTEE | translate }}</h3>
                     <span
                        class="rounded px-2 py-0.5 text-xs text-white"
                        [class]="$hasGuarantee() ? 'bg-green-500' : 'bg-amber-500'"
                        >{{
                           ($hasGuarantee() ? I18N.DETAIL_GUARANTEE_SAVED : I18N.DETAIL_GUARANTEE_NONE) | translate
                        }}</span
                     >
                  </div>

                  @if ($hasGuarantee()) {
                     <dl class="flex w-full flex-col">
                        @for (row of $guaranteeRows(); track row.label) {
                           <div
                              class="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-slate-300 px-1 py-1.5 text-sm sm:grid-cols-[8rem_1fr]"
                           >
                              <dt class="text-second">{{ row.label | translate }}:</dt>
                              <dd class="text-second/70 wrap-anywhere">{{ row.value || '-' }}</dd>
                           </div>
                        }
                     </dl>
                  } @else {
                     <p
                        class="flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                     >
                        <i class="bx bx-info-circle text-xl"></i>
                        {{ I18N.DETAIL_GUARANTEE_NONE_TEXT | translate }}
                     </p>
                  }
               </div>
            }

            <div
               class="grid w-full grid-cols-1 gap-2"
               [class]="$actions().length === 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'"
            >
               @for (action of $actions(); track action.id) {
                  <button
                     class="flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white transition-all disabled:cursor-auto disabled:bg-slate-300"
                     type="button"
                     [class]="
                        action.danger
                           ? 'bg-red-500 hover:bg-red-600 focus:bg-red-600'
                           : 'bg-second hover:bg-second-light focus:bg-second-light'
                     "
                     [disabled]="!allowed({ action, user })"
                     (click)="handleAction({ action, user })"
                  >
                     <i [class]="'bx text-xl ' + action.icon"></i>
                     {{ action.label | translate }}
                  </button>
               }
            </div>
         </div>
      } @else {
         <div class="flex w-full animate-pulse flex-col gap-3">
            @for (item of skeletons; track item) {
               <div class="h-7 w-full rounded-md bg-slate-300"></div>
            }
         </div>
      }
   `,
})
export class UserDetailDialogComponent {
   private readonly _detail: UserDetailService = inject(UserDetailService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _deletion: UserDeletionService = inject(UserDeletionService);
   private readonly _edit: UserEditService = inject(UserEditService);
   private readonly _password: UserPasswordService = inject(UserPasswordService);

   private readonly phone: PhoneFormatPipe = new PhoneFormatPipe();
   private readonly date: DatePipe = new DatePipe('en-US');

   public readonly I18N = { ...USERS_I18N_KEYS };
   public readonly skeletons: number[] = [1, 2, 3, 4, 5];

   public readonly $user: Signal<UserDetail | undefined> = computed(() => this._detail.detail);
   public readonly $loading: Signal<boolean> = computed(() => this._detail.loading);
   public readonly $failed: Signal<boolean> = computed(() => this._detail.failed);

   public readonly $rows: Signal<DetailRow[]> = computed(() => {
      const user: UserDetail | undefined = this.$user();

      if (!user) return [];

      const rows: DetailRow[] = [
         { label: USERS_I18N_KEYS.DETAIL_NAME, value: user.fullname },
         { label: USERS_I18N_KEYS.DETAIL_USERNAME, value: user.username },
      ];

      if (user.profile === 'investor' || user.profile === 'borrower') {
         rows.push(
            { label: USERS_I18N_KEYS.DETAIL_PHONE, value: this.formatPhone(user.phone_number) },
            { label: USERS_I18N_KEYS.DETAIL_CURP, value: user.curp },
         );
      }

      if (user.profile === 'borrower') rows.push({ label: USERS_I18N_KEYS.DETAIL_ADDRESS, value: user.address });

      rows.push({ label: USERS_I18N_KEYS.DETAIL_CREATED, value: this.date.transform(user.created_at, 'dd.MM.yyyy') });

      return rows;
   });

   public readonly $bankRows: Signal<DetailRow[]> = computed(() => {
      const user: UserDetail | undefined = this.$user();

      if (!user) return [];

      return [
         { label: USERS_I18N_KEYS.DETAIL_CLABE, value: this.formatClabe(user.account_clabe) },
         { label: USERS_I18N_KEYS.DETAIL_BANK, value: user.account_bank },
      ];
   });

   public readonly $guaranteeRows: Signal<DetailRow[]> = computed(() => {
      const user: UserDetail | undefined = this.$user();

      if (!user) return [];

      return [
         { label: USERS_I18N_KEYS.DETAIL_NAME, value: user.guarantee_fullname },
         { label: USERS_I18N_KEYS.DETAIL_PHONE, value: this.formatPhone(user.guarantee_phone_number) },
         { label: USERS_I18N_KEYS.DETAIL_ADDRESS, value: user.guarantee_address },
      ];
   });

   // the guarantee is considered saved when any of its data exists
   public readonly $hasGuarantee: Signal<boolean> = computed(() => {
      const user: UserDetail | undefined = this.$user();

      return !!user && !!(user.guarantee_fullname || user.guarantee_phone_number || user.guarantee_address);
   });

   // only the actions that make sense for the profile are listed
   public readonly $actions: Signal<DetailAction[]> = computed(() => {
      const user: UserDetail | undefined = this.$user();

      return ACTIONS.filter((action: DetailAction) => action.id !== 'wallet' || user?.profile === 'investor');
   });

   constructor() {
      effect(() => {
         const loading: boolean = this.$loading();
         untracked(() => (this._dialogs.loading = loading));
      });

      // the error interceptor already notified the user
      effect(() => {
         if (this.$failed()) untracked(() => this._dialogs.closeDialogs());
      });
   }

   public allowed({ action, user }: { action: DetailAction; user: UserDetail }): boolean {
      return (
         USERS_ACTION_RULES[action.id](user) &&
         this._deletion.deleting !== user.id &&
         this._password.regenerating !== user.id
      );
   }

   public handleAction({ action, user }: { action: DetailAction; user: UserDetail }): void {
      if (action.id === 'delete') this._deletion.delete({ id: user.id });

      if (action.id === 'password') {
         this._password.regenerate({ id: user.id }).then((done: boolean) => {
            if (!done) return;

            this._dialogs.newDialog({
               title: DIALOG_I18N_KEYS.USER_PASSWORD_TITLE,
               component: UserPasswordDialogComponent,
               size: 'sm',
            });
         });
      }

      if (action.id === 'edit') {
         this._edit.start({ id: user.id, profile: user.profile as EditableProfile });
         this._dialogs.newDialog({
            title: USER_EDIT_TITLES[user.profile],
            component: UserEditDialogComponent,
            size: 'lg',
         });
      }
   }

   private formatPhone(value: string | null): string | null {
      return value ? this.phone.transform(value) : null;
   }

   // 0000 0000 0000 0000 00
   private formatClabe(value: string | null): string | null {
      return value ? (value.match(/.{1,4}/g)?.join(' ') ?? value) : null;
   }
}
