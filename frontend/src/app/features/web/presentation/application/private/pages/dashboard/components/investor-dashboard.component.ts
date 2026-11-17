import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InvestorBalance } from '../../../../../../../../interfaces/cash-balance';
import { CONTACT } from '../../../../../../../data/repository/contact.repository';
import { DASHBOARD_I18N_KEYS } from '../../../../../../../data/repository/dashboard.repository';
import { SETTINGS_I18N_KEYS } from '../../../../../../../data/repository/settings.repository';
import { InvestorPanelService } from '../../../../../../../data/services/investor-panel.service';
import { PhoneFormatPipe } from '../../../../../../utilities/pipes/phone-format.pipe';

/**
 * Panel of the investor: its balance (name, start date, amount & last update)
 * and the contact media of the company
 */
@Component({
   selector: 'fi-investor-dashboard-component',
   imports: [CurrencyPipe, DatePipe, TranslatePipe],
   template: `
      @let balance = $balance();

      @if (balance) {
         <section
            class="bg-main flex w-full flex-col gap-4 rounded-2xl p-4 sm:p-6 md:flex-row md:justify-between md:gap-6"
         >
            <div class="flex min-w-0 flex-col justify-between gap-6">
               <div class="flex min-w-0 flex-col">
                  <h2
                     class="text-xl font-bold wrap-anywhere text-white sm:text-2xl"
                     id="balance-title"
                  >
                     {{ I18N.INVESTOR_BALANCE | translate: { name: balance.fullname } }}
                  </h2>
                  <span
                     class="text-xs text-white"
                     id="balance-since"
                  >
                     {{ I18N.INVESTOR_SINCE | translate: { date: (balance.since | date: 'dd.MM.yyyy') } }}
                  </span>
               </div>

               <div class="flex min-w-0 flex-col">
                  <span
                     class="text-3xl font-bold wrap-anywhere text-white sm:text-4xl"
                     id="balance-amount"
                  >
                     {{ balance.amount | currency }}
                  </span>
                  <span
                     class="text-xs text-white"
                     id="balance-updated"
                  >
                     {{ SETTINGS.BALANCE_UPDATED | translate: { date: (balance.last_update | date: 'dd.MM.yyyy') } }}
                  </span>
               </div>
            </div>

            <aside
               class="flex w-full flex-col justify-center gap-3 rounded-xl bg-white p-4 sm:p-5 md:w-72 md:shrink-0 md:items-end"
            >
               <h3
                  class="text-main text-lg md:text-right"
                  id="contact-title"
               >
                  {{ I18N.CONTACT_TITLE | translate }}
               </h3>

               <ul class="flex w-full flex-col gap-1.5 md:items-end">
                  @for (contact of contacts; track contact.icon) {
                     <li class="flex items-center gap-2 md:flex-row-reverse">
                        <i [class]="'text-main bx text-xl ' + contact.icon"></i>
                        <a
                           class="text-main text-sm font-bold wrap-anywhere"
                           [href]="contact.link"
                           >{{ contact.text }}</a
                        >
                     </li>
                  }
               </ul>
            </aside>
         </section>
      } @else {
         <div class="flex h-52 w-full animate-pulse flex-col justify-between rounded-2xl bg-slate-300 p-6">
            <div class="h-7 w-64 max-w-full rounded-md bg-slate-400/60"></div>
            <div class="h-10 w-44 rounded-md bg-slate-400/60"></div>
         </div>
      }
   `,
})
export class InvestorDashboardComponent {
   private readonly _panel: InvestorPanelService = inject(InvestorPanelService);

   public readonly I18N = DASHBOARD_I18N_KEYS;
   public readonly SETTINGS = SETTINGS_I18N_KEYS;
   public readonly contacts: { icon: string; link: string; text: string }[] = [
      { icon: 'bx-envelope-alt', link: `mailto:${CONTACT.EMAIL}`, text: CONTACT.EMAIL },
      {
         icon: 'bx-phone',
         link: `tel:${CONTACT.PHONE_NUMBER}`,
         text: new PhoneFormatPipe().transform(CONTACT.PHONE_NUMBER),
      },
   ];

   public readonly $balance: Signal<InvestorBalance | undefined> = computed(() => this._panel.balance);
}
