import { Component, computed, inject, Signal } from '@angular/core';
import { CashMovement, FieldsCashMovement } from '../../../../../../../interfaces/cash-balance';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { InvestorBalanceService } from '../../../../../../data/services/investor-balance.service';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { SETTINGS_I18N_KEYS } from '../../../../../../data/repository/settings.repository';
import { CashMovementFormComponent } from '../cash-balance/cash-movement-form.component';

interface MovementLabels {
   field: string;
   total: string;
   action: string;
}

const LABELS: Record<CashMovement, MovementLabels> = {
   deposit: {
      field: SETTINGS_I18N_KEYS.BALANCE_FIELD_DEPOSIT,
      total: SETTINGS_I18N_KEYS.BALANCE_TOTAL_DEPOSIT,
      action: FORMS_I18N_KEYS.BUTTON_DEPOSIT,
   },
   withdraw: {
      field: SETTINGS_I18N_KEYS.BALANCE_FIELD_WITHDRAW,
      total: SETTINGS_I18N_KEYS.BALANCE_TOTAL_WITHDRAW,
      action: FORMS_I18N_KEYS.BUTTON_WITHDRAW,
   },
};

/**
 * Deposit or withdrawal on the balance of an investor (the movement is set by
 * the service before opening it): same form as the one of the general cash
 * balance, but it goes back to the balance of the investor instead of closing
 */
@Component({
   selector: 'fi-investor-movement-dialog-component',
   imports: [CashMovementFormComponent],
   template: `
      @let labels = $labels();

      <fi-cash-movement-form-component
         [form]="$form()"
         [fieldLabel]="labels.field"
         [totalLabel]="labels.total"
         [actionLabel]="labels.action"
         [total]="$total()"
         [loading]="$loading()"
         (save)="handleSave()"
         (cancel)="handleCancel()"
      />
   `,
})
export class InvestorMovementDialogComponent {
   private readonly _balance: InvestorBalanceService = inject(InvestorBalanceService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly $labels: Signal<MovementLabels> = computed(() => LABELS[this._balance.movement]);
   public readonly $form: Signal<SignalForm<FieldsCashMovement>> = computed(() => this._balance.movementForm);
   public readonly $loading: Signal<boolean> = computed(() => this._balance.moving);
   public readonly $total: Signal<number> = computed(() =>
      this._balance.afterMovement({ amount: this.$form().amount().value() }),
   );

   public handleCancel(): void {
      this._dialogs.dialogBack();
   }

   public handleSave(): void {
      this._balance.submitMovement();
   }
}
