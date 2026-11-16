import { Component, computed, inject, Signal } from '@angular/core';
import { DialogsService } from '../../../../../../data/services/dialogs.service';
import { DIALOG_I18N_KEYS } from '../../../../../../data/repository/dialog.repository';
import { SettingsExtrasDialogComponent } from '../../../../common/dialogs/views/settings/settings-extras.dialog.component';
import { SettingsAgreementsDialogComponent } from '../../../../common/dialogs/views/settings/settings-agreements.dialog.component';
import { SettingsMonthlyDialogComponent } from '../../../../common/dialogs/views/settings/settings-monthly.dialog.component';
import { SettingsWeeklyDialogComponent } from '../../../../common/dialogs/views/settings/settings-weekly.dialog.component';
import { CashBalanceService } from '../../../../../../data/services/cash-balance.service';
import { CashBalance } from '../../../../../../../interfaces/cash-balance';
import { SettingsBalanceComponent } from './components/settings-balance.component';
import { SettingsService } from '../../../../../../data/services/settings.service';
import { SETTINGS_I18N_KEYS } from '../../../../../../data/repository/settings.repository';
import {
   SettingConceptRow,
   SettingRateRow,
   SettingsGroup,
   SettingsLoader,
} from '../../../../../../../interfaces/settings';
import { SettingsConceptsComponent } from './components/settings-concepts.component';
import { SettingsRatesComponent } from './components/settings-rates.component';

@Component({
   selector: 'fi-settings-page-component',
   imports: [SettingsBalanceComponent, SettingsConceptsComponent, SettingsRatesComponent],
   template: `
      @let loader = $loader();

      <div class="flex w-full flex-col gap-3 sm:gap-4">
         <fi-settings-balance-component [balance]="$balance()" />

         @if (loader.settings && !$loaded()) {
            @for (item of skeletons; track item) {
               <section class="flex w-full animate-pulse flex-col gap-4 rounded-2xl border border-slate-500 p-4 sm:p-6">
                  <div class="h-5 w-40 rounded-md bg-slate-300"></div>
                  <div class="h-24 w-full rounded-md bg-slate-300"></div>
               </section>
            }
         } @else {
            <fi-settings-concepts-component
               [title]="I18N.SECTION_EXTRAS"
               (edit)="handleEdit({ group: 'extras' })"
               [rows]="$extras()"
            />
            <fi-settings-concepts-component
               [title]="I18N.SECTION_AGREEMENTS"
               (edit)="handleEdit({ group: 'agreements' })"
               [rows]="$agreements()"
            />
            <fi-settings-rates-component
               [title]="I18N.SECTION_MONTHLY"
               (edit)="handleEdit({ group: 'monthly' })"
               period="month"
               [rows]="$monthly()"
            />
            <fi-settings-rates-component
               [title]="I18N.SECTION_WEEKLY"
               (edit)="handleEdit({ group: 'weekly' })"
               period="week"
               [rows]="$weekly()"
            />
         }
      </div>
   `,
})
export class SettingsPageComponent {
   private readonly _settings: SettingsService = inject(SettingsService);
   private readonly _cashBalance: CashBalanceService = inject(CashBalanceService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public readonly I18N = SETTINGS_I18N_KEYS;
   public readonly skeletons: number[] = [1, 2, 3, 4];

   public readonly $loader: Signal<SettingsLoader> = computed(() => this._settings.loader);
   public readonly $loaded: Signal<boolean> = computed(() => this._settings.loaded);
   public readonly $balance: Signal<CashBalance | undefined> = computed(() => this._cashBalance.balance);
   public readonly $extras: Signal<SettingConceptRow[]> = computed(() => this._settings.extras);
   public readonly $agreements: Signal<SettingConceptRow[]> = computed(() => this._settings.agreements);
   public readonly $monthly: Signal<SettingRateRow[]> = computed(() => this._settings.monthly);
   public readonly $weekly: Signal<SettingRateRow[]> = computed(() => this._settings.weekly);

   constructor() {
      if (this._settings.loaded) this._settings.reload();
      if (this._cashBalance.balance) this._cashBalance.reload();
   }

   public handleEdit({ group }: { group: SettingsGroup }): void {
      this._settings.loadForm({ group });

      switch (group) {
         case 'extras':
            this._dialogs.newDialog({
               title: DIALOG_I18N_KEYS.EDIT_EXTRAS_TITLE,
               component: SettingsExtrasDialogComponent,
               size: 'lg',
            });
            break;
         case 'agreements':
            this._dialogs.newDialog({
               title: DIALOG_I18N_KEYS.EDIT_AGREEMENTS_TITLE,
               component: SettingsAgreementsDialogComponent,
               size: 'lg',
            });
            break;
         case 'monthly':
            this._dialogs.newDialog({
               title: DIALOG_I18N_KEYS.EDIT_MONTHLY_TITLE,
               component: SettingsMonthlyDialogComponent,
               size: 'lg',
            });
            break;
         case 'weekly':
            this._dialogs.newDialog({
               title: DIALOG_I18N_KEYS.EDIT_WEEKLY_TITLE,
               component: SettingsWeeklyDialogComponent,
               size: 'lg',
            });
            break;
      }
   }
}
