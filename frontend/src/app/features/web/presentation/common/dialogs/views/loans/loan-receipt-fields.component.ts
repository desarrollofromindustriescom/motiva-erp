import { Component, input, InputSignal, output, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { RadioButtonModule } from 'primeng/radiobutton';
import { LoanPaymentMethod } from '../../../../../../../interfaces/loan';
import {
   LOAN_TICKET_EXTENSIONS,
   LOAN_TICKET_FILE_MAX_MB,
   LOAN_TICKET_MIME_TYPES,
   LOANS_I18N_KEYS,
} from '../../../../../../data/repository/loans.repository';

/**
 * How something was paid: the type of payment (radio) & the image of the receipt (chosen or dragged)
 * that only a transfer has. It only shows the state, the dialog that uses it owns the data.
 */
@Component({
   selector: 'fi-loan-receipt-fields-component',
   imports: [FormsModule, TranslatePipe, RadioButtonModule],
   host: { class: 'flex w-full flex-col gap-4' },
   template: `
      <fieldset
         class="flex w-full flex-col gap-2"
         [disabled]="disabled()"
      >
         <legend class="text-second mb-1 text-sm font-medium">{{ I18N.TICKET_FIELD_PAYMENT | translate }} *</legend>

         <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            @for (option of options; track option.id) {
               <div class="flex items-center gap-2">
                  <p-radiobutton
                     name="payment"
                     [inputId]="'payment-' + option.id"
                     [value]="option.id"
                     [ngModelOptions]="{ standalone: true }"
                     [ngModel]="payment()"
                     [disabled]="disabled()"
                     (ngModelChange)="paymentChange.emit($event)"
                  />
                  <label
                     class="text-second cursor-pointer text-sm"
                     [for]="'payment-' + option.id"
                     >{{ option.label | translate }}</label
                  >
               </div>
            }
         </div>
      </fieldset>

      @if (payment() === 'transfer') {
         @let selected = file();
         @let error = fileError();

         <div class="flex w-full flex-col gap-1">
            <div
               class="border-second bg-second/5 hover:bg-second/10 relative flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 text-center transition-all"
               role="button"
               tabindex="0"
               [class.border-red-500!]="error"
               [class.bg-second/15!]="$dragging()"
               [class.pointer-events-none]="disabled()"
               (click)="picker.click()"
               (keydown.enter)="picker.click()"
               (dragover)="handleDragOver($event)"
               (dragleave)="$dragging.set(false)"
               (drop)="handleDrop($event)"
            >
               <span
                  class="absolute top-3 right-3 size-3 rounded-full"
                  [class]="selected && !error ? 'bg-green-500' : 'bg-red-500'"
               ></span>

               <i
                  class="bx text-second text-6xl"
                  [class]="selected ? 'bx-image' : 'bx-image-add'"
               ></i>

               @if (selected) {
                  <p
                     class="text-second max-w-full text-sm font-medium wrap-anywhere"
                     id="file-name"
                  >
                     {{ selected.name }}
                  </p>
                  <span class="text-second/70 text-xs">{{ size(selected) }}</span>
                  <span class="text-second/70 text-xs">{{ I18N.TICKET_FILE_CHANGE | translate }}</span>
               } @else {
                  <div class="text-second flex flex-col text-xs">
                     <span>{{ I18N.TICKET_DROP_TITLE | translate }}</span>
                     <span>{{ I18N.TICKET_DROP_HINT | translate }}</span>
                  </div>
                  <span class="text-second/70 text-xs">{{ I18N.TICKET_DROP_ONLY_IMAGES | translate }}</span>
               }

               <input
                  #picker
                  class="hidden"
                  id="ticket"
                  type="file"
                  [accept]="accept"
                  (change)="handleInput($event)"
               />
            </div>

            @if (error) {
               <p class="text-xs text-red-500">• {{ error | translate: { size: maxMb } }}</p>
            }
         </div>
      }
   `,
})
export class LoanReceiptFieldsComponent {
   public readonly I18N = LOANS_I18N_KEYS;
   public readonly maxMb: number = LOAN_TICKET_FILE_MAX_MB;
   public readonly accept: string = [...LOAN_TICKET_MIME_TYPES, ...LOAN_TICKET_EXTENSIONS].join(',');

   public readonly options: { id: LoanPaymentMethod; label: string }[] = [
      { id: 'cash', label: LOANS_I18N_KEYS.TICKET_CASH },
      { id: 'transfer', label: LOANS_I18N_KEYS.TICKET_TRANSFER },
   ];

   public readonly payment: InputSignal<LoanPaymentMethod> = input.required();
   public readonly file: InputSignal<File | null> = input<File | null>(null);
   public readonly fileError: InputSignal<string | null> = input<string | null>(null);
   public readonly disabled: InputSignal<boolean> = input(false);

   public readonly paymentChange: OutputEmitterRef<LoanPaymentMethod> = output();
   public readonly fileChange: OutputEmitterRef<File> = output();

   public readonly $dragging: WritableSignal<boolean> = signal(false);

   public size(file: File): string {
      return file.size < 1024 * 1024
         ? `${Math.max(1, Math.round(file.size / 1024))} KB`
         : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
   }

   public handleInput(event: Event): void {
      const input: HTMLInputElement = event.target as HTMLInputElement;
      const file: File | undefined = input.files?.[0];

      if (file) this.fileChange.emit(file);

      // the same file can be chosen again after a mistake
      input.value = '';
   }

   public handleDragOver(event: DragEvent): void {
      event.preventDefault();
      this.$dragging.set(true);
   }

   public handleDrop(event: DragEvent): void {
      event.preventDefault();
      this.$dragging.set(false);

      const file: File | undefined = event.dataTransfer?.files?.[0];

      if (file) this.fileChange.emit(file);
   }
}
