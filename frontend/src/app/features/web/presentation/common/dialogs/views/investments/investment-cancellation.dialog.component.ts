import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { IftaLabelModule } from 'primeng/iftalabel';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { FieldsCancellation, Investment } from '../../../../../../../interfaces/investment';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { InvestmentCancellationService } from '../../../../../../data/services/investment-cancellation.service';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import {
   CANCELLATION_FILE_MAX_MB,
   CANCELLATION_MESSAGE_MAX,
   INVESTMENTS_I18N_KEYS,
   termLabel,
} from '../../../../../../data/repository/investments.repository';
import { FieldErrorsComponent } from '../../../forms/field-errors/field-errors.component';
import { LoaderComponent } from '../../../forms/loader/loader.component';

interface InvestmentOption {
   id: string;
   label: string;
   amount: number;
   term: { key: string; params: { count: number } };
}

/**
 * Cancellation request of investments before their term: the pdf of the request
 * (chosen or dragged), the active investments it applies to & the reasons
 */
@Component({
   selector: 'fi-investment-cancellation-dialog-component',
   imports: [
      CurrencyPipe,
      FormField,
      FormsModule,
      TranslatePipe,
      IftaLabelModule,
      MultiSelectModule,
      TextareaModule,
      FieldErrorsComponent,
      LoaderComponent,
   ],
   template: `
      @let form = $form;
      @let sending = $sending();
      @let file = $file();
      @let fileError = $fileError();

      <form
         class="flex w-full flex-col gap-4"
         (submit)="$event.preventDefault()"
      >
         <div class="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
            <div class="flex w-full flex-col gap-1">
               <div
                  class="border-second bg-second/5 hover:bg-second/10 relative flex min-h-64 w-full flex-auto cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 p-6 text-center transition-all lg:min-h-96"
                  role="button"
                  tabindex="0"
                  [class.border-red-500!]="fileError"
                  [class.bg-second/15!]="$dragging()"
                  [class.pointer-events-none]="sending"
                  (click)="picker.click()"
                  (keydown.enter)="picker.click()"
                  (dragover)="handleDragOver($event)"
                  (dragleave)="$dragging.set(false)"
                  (drop)="handleDrop($event)"
               >
                  <span
                     class="absolute top-3 right-3 size-3 rounded-full"
                     [class]="file && !fileError ? 'bg-green-500' : 'bg-red-500'"
                  ></span>

                  <i
                     class="bx text-second text-6xl"
                     [class]="file ? 'bx-folder-open' : 'bx-folder'"
                  ></i>

                  @if (file) {
                     <p
                        class="text-second max-w-full text-sm font-medium wrap-anywhere"
                        id="file-name"
                     >
                        {{ file.name }}
                     </p>
                     <span class="text-second/70 text-xs">{{ size(file) }}</span>
                     <span class="text-second/70 text-xs">{{ I18N.CANCEL_FILE_CHANGE | translate }}</span>
                  } @else {
                     <div class="text-second flex flex-col text-xs">
                        <span>{{ I18N.CANCEL_DROP_TITLE | translate }}</span>
                        <span>{{ I18N.CANCEL_DROP_HINT | translate }}</span>
                     </div>
                     <span class="text-second/70 text-xs">{{ I18N.CANCEL_DROP_ONLY_PDF | translate }}</span>
                  }

                  <input
                     #picker
                     class="hidden"
                     id="document"
                     type="file"
                     accept="application/pdf,.pdf"
                     (change)="handleInput($event)"
                  />
               </div>

               @if (fileError) {
                  <p class="text-xs text-red-500">• {{ fileError | translate: { size: maxMb } }}</p>
               }
            </div>

            <div class="flex w-full flex-col gap-3">
               <fi-field-errors-component
                  class="w-full"
                  [field]="form.investments()"
               >
                  <p-iftalabel class="w-full">
                     <p-multiselect
                        class="w-full"
                        inputId="investments"
                        styleClass="w-full"
                        optionLabel="label"
                        optionValue="id"
                        appendTo="body"
                        display="comma"
                        [maxSelectedLabels]="1"
                        [selectedItemsLabel]="I18N.CANCEL_SELECTED | translate"
                        [emptyMessage]="I18N.CANCEL_EMPTY | translate"
                        [showToggleAll]="false"
                        [options]="$options()"
                        [disabled]="sending"
                        [ngModelOptions]="{ standalone: true }"
                        [ngModel]="form.investments().value()"
                        (ngModelChange)="handleInvestments($event)"
                        (onPanelHide)="form.investments().markAsTouched()"
                     >
                        <ng-template
                           #item
                           let-option
                        >
                           <div class="flex w-full items-center justify-between gap-3">
                              <span>{{ option.label }}</span>
                              <span class="text-xs text-slate-500">
                                 {{ option.amount | currency }} ·
                                 {{ option.term.key | translate: option.term.params }}
                              </span>
                           </div>
                        </ng-template>
                     </p-multiselect>
                     <label for="investments">{{ I18N.CANCEL_FIELD_INVESTMENTS | translate }} *</label>
                  </p-iftalabel>
               </fi-field-errors-component>

               <fi-field-errors-component
                  class="flex w-full flex-auto flex-col"
                  [field]="form.message()"
               >
                  <p-iftalabel class="relative flex w-full flex-auto">
                     <textarea
                        pTextarea
                        id="message"
                        class="min-h-48 w-full flex-auto resize-none pb-8 lg:min-h-72"
                        [formField]="form.message"
                     ></textarea>
                     <label for="message">{{ I18N.CANCEL_FIELD_MESSAGE | translate }} *</label>
                     <span class="pointer-events-none absolute right-3 bottom-2 text-xs text-slate-600">
                        {{ form.message().value().length }} / {{ maxMessage }}
                     </span>
                  </p-iftalabel>
               </fi-field-errors-component>
            </div>
         </div>

         <div class="flex w-full flex-col-reverse items-center gap-2 sm:flex-row sm:justify-end">
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="sending"
               (click)="handleCancel()"
            >
               {{ FORMS.BUTTON_CLOSE | translate }}
            </button>
            <button
               class="bg-contrast flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="sending"
               (click)="handleSend()"
            >
               @if (sending) {
                  <fi-loader-component tone="white" />
               }
               {{ I18N.CANCEL_BUTTON | translate }}
            </button>
         </div>
      </form>
   `,
})
export class InvestmentCancellationDialogComponent {
   private readonly _cancellation: InvestmentCancellationService = inject(InvestmentCancellationService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = INVESTMENTS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;
   public readonly maxMb: number = CANCELLATION_FILE_MAX_MB;
   public readonly maxMessage: number = CANCELLATION_MESSAGE_MAX;

   public readonly $dragging: WritableSignal<boolean> = signal(false);

   public readonly $form: SignalForm<FieldsCancellation> = this._cancellation.form;
   public readonly $sending: Signal<boolean> = computed(() => this._cancellation.sending);
   public readonly $file: Signal<File | null> = computed(() => this._cancellation.file);
   public readonly $fileError: Signal<string | null> = computed(() => this._cancellation.fileError);
   public readonly $options: Signal<InvestmentOption[]> = computed(() =>
      this._cancellation.investments.map((investment: Investment) => ({
         id: investment.id,
         label: compactFolio(investment.folio),
         amount: investment.initial_amount,
         term: termLabel(investment.reward_cycle),
      })),
   );

   public size(file: File): string {
      return file.size < 1024 * 1024
         ? `${Math.max(1, Math.round(file.size / 1024))} KB`
         : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
   }

   public handleInput(event: Event): void {
      const input: HTMLInputElement = event.target as HTMLInputElement;

      this._cancellation.selectFile({ file: input.files?.[0] ?? null });

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
      this._cancellation.selectFile({ file: event.dataTransfer?.files?.[0] ?? null });
   }

   public handleInvestments(value: string[] | null): void {
      this.$form.investments().value.set(value ?? []);
      this.$form.investments().markAsTouched();
   }

   public handleCancel(): void {
      this._dialogs.dialogBack();
   }

   public handleSend(): void {
      this._cancellation.send();
   }
}
