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
      @let sessions = $sessions();

      <section class="w-full flex flex-col gap-4 p-6 rounded-2xl border border-slate-500">
         <div class="w-full flex items-center justify-between">
            <h2 class="font-medium text-second text-lg">{{ I18N.SECTION_TITLE_ACTIVE_SESSIONS | translate }}</h2>
            @if (loading) {
               <fi-loader-component />
            }
         </div>

         @if (!loading || sessions.length) {
            <p-table
               class="w-full"
               [value]="sessions"
            >
               <ng-template #header>
                  <tr>
                     <th>
                        <div class="flex items-center justify-center w-full">
                           <span>{{ I18N.HEAD_DEVICE | translate }}</span>
                        </div>
                     </th>
                     <th>{{ I18N.HEAD_SYSTEM | translate }}</th>
                     <th>{{ I18N.HEAD_NAVIGATOR | translate }}</th>
                     <th>{{ I18N.HEAD_FIRST_SESSION | translate }}</th>
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
                  <tr>
                     <td>
                        <div class="w-full flex items-center justify-center">
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
                     <td>{{ session.system }}</td>
                     <td>{{ session.navigator }}</td>
                     <td>{{ session.first_login | date: 'dd.MM.yyyy' }}</td>
                     <td>{{ session.last_login | date: 'dd.MM.yyyy' }}</td>
                     @if (sessions.length > 1) {
                        <td>
                           @if (!session.current) {
                              <div class="flex w-full justify-end">
                                 <button
                                    class="bg-red-500 rounded-md flex items-center justify-center-safe p-1.5 cursor-pointer hover:bg-red-600 focus:bg-red-600 transition-all disabled:cursor-auto disabled:opacity-60 disabled:hover:bg-red-500 disabled:focus:bg-red-500"
                                    tooltipPosition="top"
                                    [disabled]="loading"
                                    [pTooltip]="I18N.BUTTON_CLOSE | translate"
                                    [showDelay]="1500"
                                    (click)="$close.emit({ sessionID: session.id })"
                                 >
                                    <i class="bx bx-x text-xl text-white"></i>
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
                        <div class="flex items-center justify-center w-full">
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
                        <div class="w-full flex items-center justify-center">
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
               class="ml-auto bg-second rounded-xl flex items-center justify-center gap-2 text-white px-5 py-3 cursor-pointer hover:bg-second-light focus:bg-second-light transition-all mt-4 disabled:opacity-60 disabled:cursor-auto disabled:hover:bg-second disabled:focus:bg-second"
               [disabled]="loading"
               (click)="$closeAll.emit()"
            >
               <i class="bx bx-x text-xl"></i>
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
   public $sessions: InputSignal<ActiveSession[]> = input.required<ActiveSession[]>({ alias: 'sessions' });
   public $close: OutputEmitterRef<{ sessionID: string }> = output({ alias: 'close' });
   public $closeAll: OutputEmitterRef<void> = output({ alias: 'closeAll' });
}
