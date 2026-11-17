import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal, Signal, WritableSignal } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { CancellationRequest, Investment } from '../../../../../../../interfaces/investment';
import { CancellationReviewService } from '../../../../../../data/services/cancellation-review.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { INVESTMENTS_I18N_KEYS } from '../../../../../../data/repository/investments.repository';
import { InvestmentInfoComponent } from './investment-info.component';

/**
 * Review of the pending cancellation request of an investor: the pdf on the left,
 * the requested investments as an accordion on the right and the reasons below.
 * It can be approved only when the general cash balance covers the whole request.
 */
@Component({
   selector: 'fi-cancellation-review-dialog-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe, InvestmentInfoComponent],
   template: `
      @let request = $request();

      @if (request) {
         <div class="flex w-full flex-col gap-4">
            <div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
               <div class="flex w-full flex-col gap-1">
                  <iframe
                     class="border-second h-96 w-full rounded-xl border-2 bg-slate-100 lg:h-[34rem]"
                     id="document"
                     [title]="I18N.REVIEW_DOCUMENT | translate"
                     [src]="$document()"
                  ></iframe>
               </div>

               <div class="flex w-full min-w-0 flex-col gap-2">
                  <div class="flex flex-wrap items-end justify-between gap-1">
                     <h3 class="text-second text-lg font-medium">{{ I18N.REVIEW_INVESTMENTS | translate }}</h3>
                     <span class="text-second/70 text-xs">
                        {{ I18N.REVIEW_REQUESTED | translate: { date: (request.created_at | date: 'dd.MM.yyyy') } }}
                     </span>
                  </div>

                  <dl class="bg-second/5 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl px-3 py-2 text-sm">
                     <dt class="text-second">{{ I18N.REVIEW_TOTAL | translate }}</dt>
                     <dd
                        class="text-second text-right font-medium"
                        id="total-initial"
                     >
                        {{ request.total_initial | currency }}
                     </dd>
                     <dt class="text-second">{{ I18N.REVIEW_RECOVERED | translate }}</dt>
                     <dd
                        class="text-second/80 text-right"
                        id="total-recovered"
                     >
                        {{ request.total_recovered | currency }}
                     </dd>
                     <dt class="text-second">{{ I18N.REVIEW_REWARD | translate }}</dt>
                     <dd
                        class="text-second/80 text-right"
                        id="total-reward"
                     >
                        {{ request.total_reward | currency }}
                     </dd>
                     <dt class="text-second">{{ I18N.REVIEW_GENERAL | translate }}</dt>
                     <dd
                        class="text-right"
                        id="general-available"
                        [class.text-green-600]="request.can_approve"
                        [class.text-red-500]="!request.can_approve"
                     >
                        {{ request.general_available | currency }}
                     </dd>
                  </dl>

                  <div class="flex max-h-72 w-full flex-col gap-2 overflow-y-auto pr-1 lg:max-h-80">
                     @for (investment of request.investments; track investment.id) {
                        <section class="border-second w-full rounded-xl border-2">
                           <button
                              class="text-second flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
                              type="button"
                              [attr.aria-expanded]="isOpen(investment)"
                              (click)="handleToggle({ investment })"
                           >
                              <span class="font-medium">{{ folio(investment) }}</span>
                              <i
                                 class="bx bx-chevron-down text-xl transition-transform"
                                 [class.rotate-180]="isOpen(investment)"
                              ></i>
                           </button>

                           @if (isOpen(investment)) {
                              <div class="px-4 pb-4">
                                 <fi-investment-info-component [investment]="investment" />
                              </div>
                           }
                        </section>
                     }
                  </div>
               </div>
            </div>

            <section class="flex w-full flex-col gap-1">
               <h3 class="text-second text-sm font-medium">{{ I18N.REVIEW_MESSAGE | translate }}</h3>
               <p
                  class="text-second/80 max-h-32 w-full overflow-y-auto rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm wrap-anywhere whitespace-pre-wrap"
                  id="message"
               >
                  {{ request.message }}
               </p>
            </section>

            @if (!request.can_approve) {
               <p
                  class="flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                  id="general-warning"
               >
                  <i class="bx bx-info-circle text-xl"></i>
                  {{
                     I18N.REVIEW_GENERAL_INSUFFICIENT
                        | translate
                           : {
                                required: (request.total_initial | currency),
                                available: (request.general_available | currency),
                             }
                  }}
               </p>
            }

            <div class="flex w-full flex-col-reverse items-center gap-2 sm:flex-row sm:justify-end">
               <button
                  class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
                  type="button"
                  [disabled]="$answering()"
                  (click)="handleReject()"
               >
                  {{ I18N.REVIEW_REJECT | translate }}
               </button>
               <button
                  class="bg-contrast w-full cursor-pointer rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
                  type="button"
                  [disabled]="$answering() || !request.can_approve"
                  (click)="handleApprove()"
               >
                  {{ I18N.REVIEW_APPROVE | translate }}
               </button>
            </div>
         </div>
      } @else {
         <div class="flex w-full animate-pulse flex-col gap-3">
            <div class="h-96 w-full rounded-xl bg-slate-300"></div>
         </div>
      }
   `,
})
export class CancellationReviewDialogComponent {
   private readonly _review: CancellationReviewService = inject(CancellationReviewService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = INVESTMENTS_I18N_KEYS;

   public readonly $request: Signal<CancellationRequest | null> = computed(() => this._review.request);
   public readonly $document: Signal<SafeResourceUrl | null> = computed(() => this._review.document);
   public readonly $answering: Signal<boolean> = computed(() => this._review.answering);

   // what the user opened or closed; without a choice only the first investment is open
   private readonly $opened: WritableSignal<Record<string, boolean>> = signal({});

   constructor() {
      // the pdf url is released when the dialog is no longer on top (closed or navigated back)
      inject(DestroyRef).onDestroy(() => {
         if (this._dialogs.dialogs.at(-1)?.component !== CancellationReviewDialogComponent) this._review.clear();
      });
   }

   public folio(investment: Investment): string {
      return compactFolio(investment.folio);
   }

   public isOpen(investment: Investment): boolean {
      const request: CancellationRequest | null = this.$request();
      const opened: Record<string, boolean> = this.$opened();

      if (investment.id in opened) return opened[investment.id];

      return request?.investments[0]?.id === investment.id;
   }

   public handleToggle({ investment }: { investment: Investment }): void {
      const current: boolean = this.isOpen(investment);

      this.$opened.update((opened: Record<string, boolean>) => ({ ...opened, [investment.id]: !current }));
   }

   public handleApprove(): void {
      this._review.approve();
   }

   public handleReject(): void {
      this._review.reject();
   }
}
