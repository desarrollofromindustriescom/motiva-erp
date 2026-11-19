import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CheckboxModule } from 'primeng/checkbox';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SignalForm } from '../../../../../../../interfaces/alias';
import {
   AgreementEligible,
   AgreementLoan,
   AgreementQuote,
   FieldsAgreement,
} from '../../../../../../../interfaces/loan';
import { UserRow } from '../../../../../../../interfaces/user';
import { compactFolio } from '../../../../../../data/repository/cash-balance.repository';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { AgreementCreationService } from '../../../../../../data/services/agreement-creation.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { FieldErrorsComponent } from '../../../forms/field-errors/field-errors.component';
import { LoaderComponent } from '../../../forms/loader/loader.component';

/**
 * New agreement: the borrower (searched while typing), its loans with a week of delay or more (the
 * checked ones go into the agreement), the weeks it lasts & what it costs (read only). Starting it
 * cancels the loans & the debt is paid in weekly payments.
 */
@Component({
   selector: 'fi-agreement-create-dialog-component',
   imports: [
      CurrencyPipe,
      DecimalPipe,
      FormsModule,
      TranslatePipe,
      CheckboxModule,
      IftaLabelModule,
      InputTextModule,
      SelectModule,
      FieldErrorsComponent,
      LoaderComponent,
   ],
   template: `
      @let form = $form;
      @let saving = $saving();
      @let eligible = $eligible();
      @let quote = $quote();

      <form
         class="flex w-full flex-col gap-2"
         (submit)="$event.preventDefault()"
      >
         <fi-field-errors-component
            class="w-full"
            [field]="form.borrower_id()"
         >
            <p-iftalabel class="w-full">
               <p-select
                  class="w-full"
                  inputId="agreement-borrower"
                  styleClass="w-full"
                  optionLabel="fullname"
                  dataKey="id"
                  appendTo="body"
                  filterBy="fullname,username,curp"
                  [filter]="true"
                  [resetFilterOnHide]="true"
                  [filterPlaceholder]="LOANS.BORROWER_SEARCH | translate"
                  [emptyFilterMessage]="LOANS.BORROWER_EMPTY | translate"
                  [emptyMessage]="LOANS.BORROWER_EMPTY | translate"
                  [loading]="$searching()"
                  [ngModelOptions]="{ standalone: true }"
                  [options]="$options()"
                  [disabled]="saving"
                  [ngModel]="$borrower()"
                  (ngModelChange)="handleBorrower($event)"
                  (onFilter)="handleSearch($event.filter)"
                  (onHide)="form.borrower_id().markAsTouched()"
               >
                  <ng-template
                     #selectedItem
                     let-borrower
                  >
                     {{ borrower.fullname }}
                  </ng-template>
                  <ng-template
                     #item
                     let-borrower
                  >
                     <div class="flex flex-col">
                        <span>{{ borrower.fullname }}</span>
                        <span class="text-xs opacity-70">{{ borrower.curp || borrower.username }}</span>
                     </div>
                  </ng-template>
               </p-select>
               <label for="agreement-borrower">{{ LOANS.FIELD_BORROWER | translate }} *</label>
            </p-iftalabel>
         </fi-field-errors-component>

         <section
            class="flex w-full flex-col gap-1 rounded-xl border-2 p-3"
            [class]="$invalid() ? 'border-red-500' : 'border-second'"
         >
            <span class="text-second text-xs">{{ LOANS.AGREEMENT_FIELD_LOANS | translate }} *</span>

            @if ($loadingLoans()) {
               <div class="flex w-full animate-pulse flex-col gap-2 py-2">
                  <div class="h-6 w-full rounded-md bg-slate-300"></div>
                  <div class="h-6 w-full rounded-md bg-slate-300"></div>
               </div>
            } @else if (!eligible) {
               <p class="py-3 text-sm text-slate-500">{{ LOANS.AGREEMENT_CHOOSE_BORROWER | translate }}</p>
            } @else if (eligible.loans.length === 0) {
               <p class="py-3 text-sm text-slate-500">{{ LOANS.AGREEMENT_NO_LOANS | translate }}</p>
            } @else {
               <div class="w-full overflow-x-auto">
                  <table class="w-full min-w-120 text-sm">
                     <thead>
                        <tr class="text-second border-b border-slate-300 text-left">
                           <th class="w-10 px-1 py-2">
                              <p-checkbox
                                 inputId="agreement-all"
                                 [binary]="true"
                                 [disabled]="saving"
                                 [ngModelOptions]="{ standalone: true }"
                                 [ngModel]="$allChecked()"
                                 (ngModelChange)="handleAll($event)"
                              />
                           </th>
                           <th class="px-1 py-2 font-medium">{{ LOANS.AGREEMENT_HEAD_FOLIO | translate }}</th>
                           <th class="px-1 py-2 font-medium">{{ LOANS.AGREEMENT_HEAD_STATUS | translate }}</th>
                           <th class="px-1 py-2 text-right font-medium">
                              {{ LOANS.AGREEMENT_HEAD_WEEKS | translate }}
                           </th>
                           <th class="px-1 py-2 text-right font-medium">{{ LOANS.AGREEMENT_HEAD_DEBT | translate }}</th>
                        </tr>
                     </thead>
                     <tbody>
                        @for (loan of eligible.loans; track loan.id) {
                           <tr class="text-second/80 border-b border-slate-300">
                              <td class="px-1 py-1.5">
                                 <p-checkbox
                                    [inputId]="'agreement-loan-' + loan.id"
                                    [binary]="true"
                                    [disabled]="saving"
                                    [ngModelOptions]="{ standalone: true }"
                                    [ngModel]="isChecked(loan)"
                                    (ngModelChange)="handleLoan(loan, $event)"
                                 />
                              </td>
                              <td class="px-1 py-1.5 whitespace-nowrap">{{ folio(loan) }}</td>
                              <td class="px-1 py-1.5">
                                 <span class="rounded bg-red-500 px-2 py-0.5 text-xs text-white">{{
                                    LOANS.AGREEMENT_LATE | translate
                                 }}</span>
                              </td>
                              <td class="px-1 py-1.5 text-right">{{ loan.weeks_late }}</td>
                              <td class="px-1 py-1.5 text-right whitespace-nowrap text-red-500">
                                 -{{ loan.debt | currency }}
                              </td>
                           </tr>
                        }
                     </tbody>
                  </table>
               </div>
            }

            @if ($invalid()) {
               <span class="text-xs text-red-500">• {{ LOANS.AGREEMENT_LOANS_REQUIRED | translate }}</span>
            }
         </section>

         <div class="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
            <p-iftalabel class="w-full">
               <input
                  pInputText
                  id="agreement-debt"
                  class="w-full bg-slate-200!"
                  readonly
                  tabindex="-1"
                  [value]="$debt() > 0 ? ($debt() | currency) : ''"
               />
               <label for="agreement-debt">{{ LOANS.AGREEMENT_FIELD_DEBT | translate }}</label>
            </p-iftalabel>

            <fi-field-errors-component
               class="w-full"
               [field]="form.weeks()"
            >
               <p-iftalabel class="w-full">
                  <p-select
                     class="w-full"
                     inputId="agreement-weeks"
                     styleClass="w-full"
                     appendTo="body"
                     [ngModelOptions]="{ standalone: true }"
                     [options]="WEEKS"
                     [disabled]="saving"
                     [ngModel]="form.weeks().value()"
                     (ngModelChange)="handleWeeks($event)"
                     (onHide)="form.weeks().markAsTouched()"
                  >
                     <ng-template
                        #selectedItem
                        let-weeks
                     >
                        {{ LOANS.AGREEMENT_WEEKS_OPTION | translate: { count: weeks } }}
                     </ng-template>
                     <ng-template
                        #item
                        let-weeks
                     >
                        {{ LOANS.AGREEMENT_WEEKS_OPTION | translate: { count: weeks } }}
                     </ng-template>
                  </p-select>
                  <label for="agreement-weeks">{{ LOANS.AGREEMENT_FIELD_WEEKS | translate }} *</label>
               </p-iftalabel>
            </fi-field-errors-component>
         </div>

         <div class="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
            <p-iftalabel class="w-full">
               <input
                  pInputText
                  id="agreement-rate"
                  class="w-full bg-slate-200!"
                  readonly
                  tabindex="-1"
                  [value]="eligible ? (eligible.rate | number: '1.0-3') + ' %' : ''"
               />
               <label for="agreement-rate">{{ LOANS.FIELD_RATE | translate }}</label>
            </p-iftalabel>
            <p-iftalabel class="w-full">
               <input
                  pInputText
                  id="agreement-payment"
                  class="w-full bg-slate-200!"
                  readonly
                  tabindex="-1"
                  [value]="quote ? (quote.payment | currency) : ''"
               />
               <label for="agreement-payment">{{ LOANS.FIELD_PAYMENT | translate }}</label>
            </p-iftalabel>
            <p-iftalabel class="w-full">
               <input
                  pInputText
                  id="agreement-total"
                  class="w-full bg-slate-200!"
                  readonly
                  tabindex="-1"
                  [value]="quote ? (quote.total | currency) : ''"
               />
               <label for="agreement-total">{{ LOANS.FIELD_TOTAL | translate }}</label>
            </p-iftalabel>
         </div>

         <div class="flex w-full flex-col-reverse items-center gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
               class="w-full cursor-pointer rounded-lg bg-red-500 px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="saving"
               (click)="handleCancel()"
            >
               {{ FORMS.BUTTON_CANCEL | translate }}
            </button>
            <button
               class="bg-contrast flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="submit"
               [disabled]="saving"
               (click)="handleStart()"
            >
               @if (saving) {
                  <fi-loader-component tone="white" />
               }
               {{ LOANS.AGREEMENT_BUTTON_START | translate }}
            </button>
         </div>
      </form>
   `,
})
export class AgreementCreateDialogComponent {
   private readonly _agreement: AgreementCreationService = inject(AgreementCreationService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly LOANS = LOANS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;
   public readonly WEEKS: number[] = this._agreement.weeksOptions;

   public readonly $form: SignalForm<FieldsAgreement> = this._agreement.form;
   public readonly $saving: Signal<boolean> = computed(() => this._agreement.saving);
   public readonly $borrower: Signal<UserRow | null> = computed(() => this._agreement.borrower);
   public readonly $searching: Signal<boolean> = computed(() => this._agreement.searching);
   public readonly $eligible: Signal<AgreementEligible | null> = computed(() => this._agreement.eligible);
   public readonly $loadingLoans: Signal<boolean> = computed(() => this._agreement.loadingLoans);
   public readonly $debt: Signal<number> = computed(() => this._agreement.debt);
   public readonly $quote: Signal<AgreementQuote | null> = computed(() => this._agreement.quote);
   public readonly $invalid: Signal<boolean> = computed(() => this._agreement.loansInvalid);

   // the borrower already chosen stays in the list while the user searches for others
   public readonly $options: Signal<UserRow[]> = computed(() => {
      const borrower: UserRow | null = this._agreement.borrower;
      const borrowers: UserRow[] = this._agreement.borrowers;

      return borrower && !borrowers.some((item: UserRow) => item.id === borrower.id)
         ? [borrower, ...borrowers]
         : borrowers;
   });

   public readonly $allChecked: Signal<boolean> = computed(() => {
      const loans: AgreementLoan[] = this._agreement.eligible?.loans ?? [];

      return loans.length > 0 && loans.every((loan: AgreementLoan) => this._agreement.checked.includes(loan.id));
   });

   public folio(loan: AgreementLoan): string {
      return compactFolio(loan.folio);
   }

   public isChecked(loan: AgreementLoan): boolean {
      return this._agreement.checked.includes(loan.id);
   }

   public handleSearch(search: string | null | undefined): void {
      this._agreement.searchBorrowers({ search: search ?? '' });
   }

   public handleBorrower(borrower: UserRow | null): void {
      this._agreement.selectBorrower({ borrower });
   }

   public handleLoan(loan: AgreementLoan, checked: boolean): void {
      this._agreement.toggleLoan({ id: loan.id, checked });
   }

   public handleAll(checked: boolean): void {
      this._agreement.toggleAll({ checked });
   }

   public handleWeeks(weeks: number | null): void {
      this.$form.weeks().value.set(weeks);
      this.$form.weeks().markAsTouched();
   }

   public handleCancel(): void {
      this._dialogs.closeDialogs();
   }

   public handleStart(): void {
      this._agreement.begin();
   }
}
