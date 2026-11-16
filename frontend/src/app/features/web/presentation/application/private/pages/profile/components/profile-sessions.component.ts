import { DatePipe, NgClass } from '@angular/common';
import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ActiveSession } from '../../../../../../../../interfaces/user';
import { PROFILE_I18N_KEYS } from '../../../../../../../data/repository/profile.repository';
import { FORMS_I18N_KEYS } from '../../../../../../../data/repository/forms.repository';
import { TABLE_I18N_KEYS } from '../../../../../../../data/repository/table.repository';
import { TooltipModule } from 'primeng/tooltip';
import { LoaderComponent } from '../../../../../common/forms/loader/loader.component';

@Component({
   selector: 'fi-profile-sessions-component',
   imports: [DatePipe, TableModule, TranslatePipe, NgClass, TooltipModule, LoaderComponent],
   template: `
      @let loading = $loading();
      @let closingAll = $closingAll();
      @let closing = $closing();
      @let sessions = $sessions();
      @let busy = loading || closingAll;
      @let anyClosing = closingAny(closing);

      <section class="flex w-full flex-col gap-4 rounded-2xl border border-slate-500 p-4 sm:p-6">
         <div class="flex w-full items-center justify-between">
            <h2 class="text-second text-lg font-medium">{{ I18N.SECTION_TITLE_ACTIVE_SESSIONS | translate }}</h2>
            @if (loading) {
               <fi-loader-component />
            }
         </div>

         @if (!loading || sessions.length) {
            <p-table
               class="block w-full max-sm:[&_td]:px-2! max-sm:[&_th]:px-2!"
               [value]="sessions"
            >
               <ng-template #header>
                  <tr>
                     <th>
                        <div class="flex w-full items-center justify-center">
                           <span>{{ I18N.HEAD_DEVICE | translate }}</span>
                        </div>
                     </th>
                     <th>{{ I18N.HEAD_SYSTEM | translate }}</th>
                     <th class="max-sm:hidden">{{ I18N.HEAD_NAVIGATOR | translate }}</th>
                     <th class="max-md:hidden">{{ I18N.HEAD_FIRST_SESSION | translate }}</th>
                     <th>{{ I18N.HEAD_LAST_SESSION | translate }}</th>
                     @if (sessions.length > 1) {
                        <th></th>
                     }
                  </tr>
               </ng-template>
               <ng-template
                  #body
                  let-session
               >
                  <tr [ngClass]="{ 'opacity-60': closing[session.id] }">
                     <td>
                        <div class="flex w-full items-center justify-center">
                           <i
                              class="bx text-second text-4xl"
                              [ngClass]="{
                                 'bx-mobile': session.device === 'Mobile',
                                 'bx-laptop-alt': session.device === 'Desktop',
                              }"
                           >
                           </i>
                        </div>
                     </td>
                     <td class="max-sm:max-w-28 max-sm:wrap-anywhere">{{ session.system }}</td>
                     <td class="max-sm:hidden">{{ session.navigator }}</td>
                     <td class="max-md:hidden">{{ session.first_login | date: 'dd.MM.yyyy' }}</td>
                     <td>{{ session.last_login | date: 'dd.MM.yyyy' }}</td>
                     @if (sessions.length > 1) {
                        <td>
                           @if (!session.current) {
                              <div class="flex w-full justify-end">
                                 <button
                                    class="flex cursor-pointer items-center justify-center-safe rounded-md bg-red-500 p-1.5 transition-all hover:bg-red-600 focus:bg-red-600 disabled:cursor-auto disabled:opacity-60 disabled:hover:bg-red-500 disabled:focus:bg-red-500"
                                    tooltipPosition="top"
                                    [disabled]="busy || closing[session.id]"
                                    [pTooltip]="I18N.BUTTON_CLOSE | translate"
                                    [showDelay]="1500"
                                    (click)="$close.emit({ sessionID: session.id })"
                                 >
                                    @if (closing[session.id]) {
                                       <span class="flex size-5 items-center justify-center">
                                          <fi-loader-component tone="white" />
                                       </span>
                                    } @else {
                                       <i class="bx bx-x text-xl text-white"></i>
                                    }
                                 </button>
                              </div>
                           }
                        </td>
                     }
                  </tr>
               </ng-template>
            </p-table>
         }
         @if (loading && !sessions.length) {
            <p-table
               class="w-full animate-pulse"
               [value]="[1]"
            >
               <ng-template #header>
                  <tr>
                     <th>
                        <div class="flex w-full items-center justify-center">
                           <div class="h-4 w-24 rounded-md bg-slate-300"></div>
                        </div>
                     </th>
                     <th><div class="h-4 w-24 rounded-md bg-slate-300"></div></th>
                     <th><div class="h-4 w-24 rounded-md bg-slate-300"></div></th>
                     <th><div class="h-4 w-24 rounded-md bg-slate-300"></div></th>
                     <th><div class="h-4 w-24 rounded-md bg-slate-300"></div></th>
                     <th></th>
                  </tr>
               </ng-template>
               <ng-template #body>
                  <tr>
                     <td>
                        <div class="flex w-full items-center justify-center">
                           <div class="size-7 rounded-full bg-slate-300"></div>
                        </div>
                     </td>
                     <td><div class="h-4 w-16 rounded-md bg-slate-300"></div></td>
                     <td><div class="h-4 w-16 rounded-md bg-slate-300"></div></td>
                     <td><div class="h-4 w-16 rounded-md bg-slate-300"></div></td>
                     <td><div class="h-4 w-16 rounded-md bg-slate-300"></div></td>
                     <td>
                        <div class="flex w-full justify-end">
                           <div class="size-7 rounded-md bg-slate-300"></div>
                        </div>
                     </td>
                  </tr>
               </ng-template>
            </p-table>
         }

         @if (sessions.length > 1) {
            <button
               class="bg-second hover:bg-second-light focus:bg-second-light disabled:hover:bg-second disabled:focus:bg-second mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:ml-auto sm:w-auto"
               [disabled]="busy || anyClosing"
               (click)="$closeAll.emit()"
            >
               @if (closingAll) {
                  <span class="flex size-5 items-center justify-center">
                     <fi-loader-component tone="white" />
                  </span>
               } @else {
                  <i class="bx bx-x text-xl"></i>
               }
               <span class="text-sm">{{ I18N.BUTTON_CLOSE_ALL_SESSIONS | translate }}</span>
            </button>
         }
      </section>
   `,
})
export class ProfileSessionsComponent {
   public readonly I18N = {
      ...PROFILE_I18N_KEYS,
      ...FORMS_I18N_KEYS,
      ...TABLE_I18N_KEYS,
   };

   public $loading: InputSignal<boolean> = input(false, { alias: 'loading' });
   public $closingAll: InputSignal<boolean> = input(false, { alias: 'closingAll' });
   public $closing: InputSignal<Record<string, boolean>> = input<Record<string, boolean>>({}, { alias: 'closing' });
   public $sessions: InputSignal<ActiveSession[]> = input.required<ActiveSession[]>({ alias: 'sessions' });
   public closingAny(closing: Record<string, boolean>): boolean {
      return Object.keys(closing).length > 0;
   }

   public $close: OutputEmitterRef<{ sessionID: string }> = output({ alias: 'close' });
   public $closeAll: OutputEmitterRef<void> = output({ alias: 'closeAll' });
}
