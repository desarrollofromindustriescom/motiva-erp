import { Component, computed, inject, Signal } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanReceiptViewService } from '../../../../../../data/services/loan-receipt-view.service';

/**
 * Image of the receipt of a transfer, it opens over the payments table so the user can come back to it
 */
@Component({
   selector: 'fi-loan-receipt-view-dialog-component',
   imports: [TranslatePipe],
   template: `
      <div class="flex w-full flex-col gap-4">
         @if ($image(); as image) {
            <a
               class="block w-full overflow-hidden rounded-lg border border-slate-300"
               target="_blank"
               rel="noopener"
               [href]="image"
            >
               <img
                  class="max-h-[70vh] w-full object-contain"
                  [src]="image"
                  [alt]="I18N.DETAIL_TICKET_ALT | translate"
               />
            </a>
         } @else if ($failed()) {
            <p class="text-second/70 py-6 text-center text-sm">{{ I18N.RECEIPT_EMPTY | translate }}</p>
         } @else {
            <div class="h-64 w-full animate-pulse rounded-md bg-slate-300"></div>
         }

         <button
            class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all sm:ml-auto sm:w-auto"
            type="button"
            (click)="handleClose()"
         >
            {{ FORMS.BUTTON_CLOSE | translate }}
         </button>
      </div>
   `,
})
export class LoanReceiptViewDialogComponent {
   private readonly _receipt: LoanReceiptViewService = inject(LoanReceiptViewService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;

   public readonly $image: Signal<SafeUrl | null> = computed(() => this._receipt.image);
   public readonly $failed: Signal<boolean> = computed(() => this._receipt.failed);

   public handleClose(): void {
      // the local url of the image is released with the next receipt, the dialog can be rendered again while it loads
      this._dialogs.dialogBack();
   }
}
