import { Component, computed, inject, Signal } from '@angular/core';
import { UserProfile } from '../../../../../../../interfaces/user';
import { BorrowerLoansService } from '../../../../../../data/services/borrower-loans.service';
import { BorrowerPanelService } from '../../../../../../data/services/borrower-panel.service';
import { InvestorPanelService } from '../../../../../../data/services/investor-panel.service';
import { SessionService } from '../../../../../../data/services/session.service';
import { BorrowerDashboardComponent } from './components/borrower-dashboard.component';
import { InvestorDashboardComponent } from './components/investor-dashboard.component';

/**
 * Panel of the profiles that have one: the investor's & the borrower's
 */
@Component({
   selector: 'fi-dashboard-page-component',
   imports: [InvestorDashboardComponent, BorrowerDashboardComponent],
   host: { class: 'flex flex-col' },
   template: `
      @if ($profile() === 'investor') {
         <fi-investor-dashboard-component />
      } @else if ($profile() === 'borrower') {
         <fi-borrower-dashboard-component class="flex flex-auto flex-col" />
      }
   `,
})
export class DashboardPageComponent {
   private readonly _session: SessionService = inject(SessionService);
   private readonly _panel: InvestorPanelService = inject(InvestorPanelService);
   private readonly _borrowerPanel: BorrowerPanelService = inject(BorrowerPanelService);
   private readonly _borrowerLoans: BorrowerLoansService = inject(BorrowerLoansService);

   public readonly $profile: Signal<UserProfile | undefined> = computed(() => this._session.session?.profile);

   constructor() {
      // the data is asked again every time the panel is entered
      if (this._session.session?.profile === 'investor') this._panel.enter();

      if (this._session.session?.profile === 'borrower') {
         this._borrowerPanel.enter();
         this._borrowerLoans.enter();
      }
   }
}
