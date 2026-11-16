import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { CashBalanceService } from '../../../../../../data/services/cash-balance.service';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { FORMS_I18N_KEYS } from '../../../../../../data/repository/forms.repository';
import { SETTINGS_I18N_KEYS } from '../../../../../../data/repository/settings.repository';
import { FieldsCashMovement } from '../../../../../../../interfaces/cash-balance';
import { SignalForm } from '../../../../../../../interfaces/alias';
import { CashMovementFormComponent } from './cash-movement-form.component';

@Component({
   selector: 'fi-cash-withdraw-dialog-component',
   imports: [CashMovementFormComponent],
   template: `
      <fi-cash-movement-form-component
         [form]="$form"
         [fieldLabel]="FIELD_LABEL"
         [totalLabel]="TOTAL_LABEL"
         [actionLabel]="ACTION_LABEL"
         [total]="$total()"
         [loading]="$loading()"
         (save)="handleSave()"
         (cancel)="handleCancel()"
      />
   `,
})
export class CashWithdrawDialogComponent {
   private readonly _cashBalance: CashBalanceService = inject(CashBalanceService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly FIELD_LABEL: string = SETTINGS_I18N_KEYS.BALANCE_FIELD_WITHDRAW;
   public readonly TOTAL_LABEL: string = SETTINGS_I18N_KEYS.BALANCE_TOTAL_WITHDRAW;
   public readonly ACTION_LABEL: string = FORMS_I18N_KEYS.BUTTON_WITHDRAW;

   public readonly $form: SignalForm<FieldsCashMovement> = this._cashBalance.forms.withdraw;
   public readonly $loading: Signal<boolean> = computed(() => this._cashBalance.loader.withdraw);
   public readonly $total: Signal<number> = computed(() =>
      this._cashBalance.afterMovement({ movement: 'withdraw', amount: this.$form.amount().value() }),
   );

   constructor() {
      effect(() => {
         const loading: boolean = this.$loading();
         untracked(() => (this._dialogs.loading = loading));
      });
   }

   public handleCancel(): void {
      this._dialogs.closeDialogs();
   }

   public handleSave(): void {
      this._cashBalance.withdraw();
   }
}
