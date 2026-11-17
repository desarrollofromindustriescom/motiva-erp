import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { CheckboxModule } from 'primeng/checkbox';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { FieldsLoan, LoanFunds, LoanInvestorFund, LoanType } from '../../../../../../../interfaces/loan';
import { UserRow } from '../../../../../../../interfaces/user';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { LOAN_TYPE_OPTIONS, LOANS_I18N_KEYS } from '../../../../../../data/repository/loans.repository';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { LoanCreationService } from '../../../../../../data/services/loan-creation.service';
import { FieldErrorsComponent } from '../../../forms/field-errors/field-errors.component';
import { LoaderComponent } from '../../../forms/loader/loader.component';

/**
 * New loan: the request (the borrower is searched while typing, the number of payments
 * depends on the type), what it costs (read only, calculated with the interest of the
 * terms) & the cash balances the money is taken from. Saving leaves it pending, approving
 * needs the places checked & takes the money from them.
 */
@Component({
   selector: 'fi-loan-create-dialog-component',
   imports: [
      CurrencyPipe,
      DecimalPipe,
      FormField,
      FormsModule,
      TranslatePipe,
      CheckboxModule,
      IftaLabelModule,
      InputNumberModule,
      InputTextModule,
      SelectModule,
      FieldErrorsComponent,
      LoaderComponent,
   ],
   providers: [CurrencyPipe],
   template: `
      @let form = $form;
      @let saving = $saving();
      @let funds = $funds();
      @let rate = $rate();
      @let quote = $quote();

      <form
         class="flex w-full flex-col gap-4"
         (submit)="$event.preventDefault()"
      >
         <section class="flex w-full flex-col gap-2">
            <h3 class="text-second font-medium">{{ I18N.SECTION_REQUEST | translate }}</h3>

            <fi-field-errors-component
               class="w-full"
               [field]="form.borrower_id()"
            >
               <p-iftalabel class="w-full">
                  <p-select
                     class="w-full"
                     inputId="borrower"
                     styleClass="w-full"
                     optionLabel="fullname"
                     dataKey="id"
                     appendTo="body"
                     filterBy="fullname,username,curp"
                     [filter]="true"
                     [resetFilterOnHide]="true"
                     [filterPlaceholder]="I18N.BORROWER_SEARCH | translate"
                     [emptyFilterMessage]="I18N.BORROWER_EMPTY | translate"
                     [emptyMessage]="I18N.BORROWER_EMPTY | translate"
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
                  <label for="borrower">{{ I18N.FIELD_BORROWER | translate }} *</label>
               </p-iftalabel>
            </fi-field-errors-component>

            <div class="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
               <fi-field-errors-component
                  class="w-full"
                  [field]="form.amount()"
               >
                  <p-iftalabel class="w-full">
                     <p-inputnumber
                        class="w-full"
                        inputId="amount"
                        inputStyleClass="w-full"
                        mode="decimal"
                        prefix="$ "
                        locale="en-US"
                        [minFractionDigits]="0"
                        [maxFractionDigits]="2"
                        [formField]="form.amount"
                     />
                     <label for="amount">{{ I18N.FIELD_AMOUNT | translate }} *</label>
                  </p-iftalabel>
               </fi-field-errors-component>

               <fi-field-errors-component
                  class="w-full"
                  [field]="form.type()"
               >
                  <p-iftalabel class="w-full">
                     <p-select
                        class="w-full"
                        inputId="type"
                        styleClass="w-full"
                        optionValue="id"
                        appendTo="body"
                        [ngModelOptions]="{ standalone: true }"
                        [options]="TYPES"
                        [disabled]="saving"
                        [ngModel]="form.type().value() || null"
                        (ngModelChange)="handleType($event)"
                        (onHide)="form.type().markAsTouched()"
                     >
                        <ng-template
                           #selectedItem
                           let-type
                        >
                           {{ type.label | translate }}
                        </ng-template>
                        <ng-template
                           #item
                           let-type
                        >
                           {{ type.label | translate }}
                        </ng-template>
                     </p-select>
                     <label for="type">{{ I18N.FIELD_TYPE | translate }} *</label>
                  </p-iftalabel>
               </fi-field-errors-component>

               <fi-field-errors-component
                  class="w-full"
                  [field]="form.no_payments()"
               >
                  <p-iftalabel class="w-full">
                     <p-select
                        class="w-full"
                        inputId="payments"
                        styleClass="w-full"
                        appendTo="body"
                        [ngModelOptions]="{ standalone: true }"
                        [options]="$payments()"
                        [disabled]="saving || !form.type().value()"
                        [ngModel]="form.no_payments().value()"
                        (ngModelChange)="handlePayments($event)"
                        (onHide)="form.no_payments().markAsTouched()"
                     >
                        <ng-template
                           #selectedItem
                           let-payments
                        >
                           {{ paymentsLabel(payments).key | translate: paymentsLabel(payments).params }}
                        </ng-template>
                        <ng-template
                           #item
                           let-payments
                        >
                           {{ paymentsLabel(payments).key | translate: paymentsLabel(payments).params }}
                        </ng-template>
                     </p-select>
                     <label for="payments">{{ I18N.FIELD_NO_PAYMENTS | translate }} *</label>
                  </p-iftalabel>
               </fi-field-errors-component>
            </div>

            <div class="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
               <p-iftalabel class="w-full">
                  <input
                     pInputText
                     id="rate"
                     class="w-full bg-slate-200!"
                     readonly
                     tabindex="-1"
                     [value]="rate === null ? '' : (rate | number: '1.0-3') + ' %'"
                  />
                  <label for="rate">{{ I18N.FIELD_RATE | translate }}</label>
               </p-iftalabel>
               <p-iftalabel class="w-full">
                  <input
                     pInputText
                     id="payment"
                     class="w-full bg-slate-200!"
                     readonly
                     tabindex="-1"
                     [value]="quote ? (quote.payment | currency) : ''"
                  />
                  <label for="payment">{{ I18N.FIELD_PAYMENT | translate }}</label>
               </p-iftalabel>
               <p-iftalabel class="w-full">
                  <input
                     pInputText
                     id="total"
                     class="w-full bg-slate-200!"
                     readonly
                     tabindex="-1"
                     [value]="quote ? (quote.total | currency) : ''"
                  />
                  <label for="total">{{ I18N.FIELD_TOTAL | translate }}</label>
               </p-iftalabel>
            </div>
         </section>

         <section class="flex w-full flex-col gap-2">
            <h3 class="text-second font-medium">{{ I18N.SECTION_FUNDS | translate }}</h3>

            @if (funds) {
               <div class="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
                  @if (funds.general_available > 0) {
                     <div class="flex w-full flex-col gap-1">
                        <label
                           class="border-second flex w-full cursor-pointer flex-col gap-3 rounded-xl border-2 p-3"
                           for="fund-general"
                        >
                           <span class="flex items-center gap-2">
                              <p-checkbox
                                 inputId="fund-general"
                                 [binary]="true"
                                 [disabled]="saving"
                                 [ngModelOptions]="{ standalone: true }"
                                 [ngModel]="$general().checked"
                                 (ngModelChange)="handleGeneral($event)"
                              />
                              {{ I18N.FUND_GENERAL | translate }}
                           </span>
                           <span class="text-second text-right text-lg font-bold">{{
                              funds.general_available | currency
                           }}</span>
                        </label>

                        <p-iftalabel class="w-full">
                           <p-inputnumber
                              class="w-full"
                              inputId="take-general"
                              inputStyleClass="w-full"
                              mode="decimal"
                              prefix="$ "
                              locale="en-US"
                              [minFractionDigits]="0"
                              [maxFractionDigits]="2"
                              [min]="0"
                              [max]="funds.general_available"
                              [ngModelOptions]="{ standalone: true }"
                              [disabled]="saving || !$general().checked"
                              [ngModel]="$general().amount"
                              (ngModelChange)="handleGeneralAmount($event)"
                           />
                           <label for="take-general">{{ I18N.FIELD_TAKE | translate }}</label>
                        </p-iftalabel>
                     </div>
                  }

                  @for (investor of funds.investors; track investor.id) {
                     @let choice = choiceOf(investor);

                     <div class="flex w-full flex-col gap-1">
                        <label
                           class="border-second flex w-full cursor-pointer flex-col gap-3 rounded-xl border-2 p-3"
                           [for]="'fund-' + investor.id"
                        >
                           <span class="flex items-center gap-2">
                              <p-checkbox
                                 [inputId]="'fund-' + investor.id"
                                 [binary]="true"
                                 [disabled]="saving"
                                 [ngModelOptions]="{ standalone: true }"
                                 [ngModel]="choice.checked"
                                 (ngModelChange)="handleInvestor(investor, $event)"
                              />
                              {{ I18N.FUND_INVESTOR | translate: { name: investor.fullname } }}
                           </span>
                           <span class="text-second text-right text-lg font-bold">{{
                              investor.available | currency
                           }}</span>
                        </label>

                        <p-iftalabel class="w-full">
                           <p-inputnumber
                              class="w-full"
                              mode="decimal"
                              prefix="$ "
                              locale="en-US"
                              inputStyleClass="w-full"
                              [inputId]="'take-' + investor.id"
                              [minFractionDigits]="0"
                              [maxFractionDigits]="2"
                              [min]="0"
                              [max]="investor.available"
                              [ngModelOptions]="{ standalone: true }"
                              [disabled]="saving || !choice.checked"
                              [ngModel]="choice.amount"
                              (ngModelChange)="handleInvestorAmount(investor, $event)"
                           />
                           <label [for]="'take-' + investor.id">{{ I18N.FIELD_TAKE | translate }}</label>
                        </p-iftalabel>
                     </div>
                  }
               </div>

               @if (funds.general_available <= 0 && funds.investors.length === 0) {
                  <p class="text-sm text-slate-500">{{ I18N.FUNDS_EMPTY | translate }}</p>
               } @else {
                  <p
                     class="text-sm"
                     [class.text-green-600]="$summary().complete"
                     [class.text-red-500]="!$summary().complete && $summary().anyChecked"
                     [class.text-slate-500]="!$summary().anyChecked"
                  >
                     {{ $summary().text.key | translate: $summary().text.params }}
                  </p>
               }
            } @else if ($loadingFunds()) {
               <p class="text-sm text-slate-500">{{ I18N.FUNDS_LOADING | translate }}</p>
            } @else {
               <p class="text-sm text-slate-500">{{ I18N.FUNDS_HINT | translate }}</p>
            }
         </section>

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
               class="bg-main flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="saving"
               (click)="handleSave()"
            >
               @if (saving) {
                  <fi-loader-component tone="white" />
               }
               {{ I18N.BUTTON_SAVE | translate }}
            </button>
            <button
               class="bg-contrast flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 text-white transition-all disabled:cursor-auto disabled:opacity-60 sm:w-auto"
               type="button"
               [disabled]="saving || !$fundsValid()"
               (click)="handleApprove()"
            >
               {{ I18N.BUTTON_APPROVE | translate }}
            </button>
         </div>
      </form>
   `,
})
export class LoanCreateDialogComponent {
   private readonly _loan: LoanCreationService = inject(LoanCreationService);
   private readonly _dialogs: DialogsService = inject(DialogsService);
   private readonly _currency: CurrencyPipe = inject(CurrencyPipe);

   public readonly I18N = LOANS_I18N_KEYS;
   public readonly FORMS = FORMS_I18N_KEYS;
   public readonly TYPES = LOAN_TYPE_OPTIONS;

   public readonly $form: SignalForm<FieldsLoan> = this._loan.form;
   public readonly $saving: Signal<boolean> = computed(() => this._loan.saving);
   public readonly $borrower: Signal<UserRow | null> = computed(() => this._loan.borrower);
   public readonly $searching: Signal<boolean> = computed(() => this._loan.searching);
   public readonly $funds: Signal<LoanFunds | undefined> = computed(() => this._loan.funds);
   public readonly $loadingFunds: Signal<boolean> = computed(() => this._loan.loadingFunds);
   public readonly $rate: Signal<number | null> = computed(() => this._loan.rate);
   public readonly $quote = computed(() => this._loan.quote);
   public readonly $general = computed(() => this._loan.general);
   public readonly $fundsValid: Signal<boolean> = computed(() => this._loan.fundsValid);
   public readonly $payments: Signal<number[]> = computed(() => this._loan.paymentOptions);

   // the borrower already chosen stays in the list while the user searches for others
   public readonly $options: Signal<UserRow[]> = computed(() => {
      const borrower: UserRow | null = this._loan.borrower;
      const borrowers: UserRow[] = this._loan.borrowers;

      return borrower && !borrowers.some((item: UserRow) => item.id === borrower.id)
         ? [borrower, ...borrowers]
         : borrowers;
   });

   // how much of the loan is covered by the checked places
   public readonly $summary = computed(() => {
      const amount: number = this._loan.form.amount().value() ?? 0;
      const difference: number = this._loan.difference;
      const anyChecked: boolean = this._loan.general.checked || this.investorsChecked();
      const money = (value: number): string => this._currency.transform(Math.abs(value)) ?? '';

      if (anyChecked && difference === 0 && amount > 0) {
         return { anyChecked, complete: true, text: { key: LOANS_I18N_KEYS.FUNDS_COMPLETE, params: {} } };
      }

      if (difference < 0) {
         return {
            anyChecked,
            complete: false,
            text: { key: LOANS_I18N_KEYS.FUNDS_EXCEEDS, params: { extra: money(difference) } },
         };
      }

      return {
         anyChecked,
         complete: false,
         text: anyChecked
            ? { key: LOANS_I18N_KEYS.FUNDS_MISSING, params: { missing: money(difference) } }
            : {
                 key: LOANS_I18N_KEYS.FUNDS_SELECTED,
                 params: { selected: money(this._loan.selected), total: money(amount) },
              },
      };
   });

   private investorsChecked(): boolean {
      return (this._loan.funds?.investors ?? []).some(
         (investor: LoanInvestorFund) => this._loan.choiceOf({ id: investor.id }).checked,
      );
   }

   public paymentsLabel(payments: number): { key: string; params: { count: number } } {
      return {
         key: payments === 1 ? LOANS_I18N_KEYS.PAYMENTS_OPTION_ONE : LOANS_I18N_KEYS.PAYMENTS_OPTION,
         params: { count: payments },
      };
   }

   public choiceOf(investor: LoanInvestorFund) {
      return this._loan.choiceOf({ id: investor.id });
   }

   public handleSearch(search: string | null | undefined): void {
      this._loan.searchBorrowers({ search: search ?? '' });
   }

   public handleBorrower(borrower: UserRow | null): void {
      this._loan.selectBorrower({ borrower });
   }

   public handleType(type: LoanType | null): void {
      this._loan.selectType({ type });
   }

   public handlePayments(payments: number | null): void {
      this._loan.selectPayments({ payments });
   }

   public handleGeneral(checked: boolean): void {
      this._loan.toggleGeneral({ checked });
   }

   public handleGeneralAmount(amount: number | null): void {
      this._loan.setGeneralAmount({ amount });
   }

   public handleInvestor(investor: LoanInvestorFund, checked: boolean): void {
      this._loan.toggleInvestor({ investor, checked });
   }

   public handleInvestorAmount(investor: LoanInvestorFund, amount: number | null): void {
      this._loan.setInvestorAmount({ id: investor.id, amount });
   }

   public handleCancel(): void {
      this._dialogs.closeDialogs();
   }

   public handleSave(): void {
      this._loan.save();
   }

   public handleApprove(): void {
      this._loan.approve();
   }
}
