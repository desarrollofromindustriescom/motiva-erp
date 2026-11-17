import { Component, computed, inject, Signal } from '@angular/core';
import { UserProfile } from '../../../../../../../interfaces/user';
import { InvestorPanelService } from '../../../../../../data/services/investor-panel.service';
import { SessionService } from '../../../../../../data/services/session.service';
import { InvestorDashboardComponent } from './components/investor-dashboard.component';

/**
 * Panel of the profiles that have one: for now the investor's
 */
@Component({
   selector: 'fi-dashboard-page-component',
   imports: [InvestorDashboardComponent],
   template: `
      @if ($profile() === 'investor') {
         <fi-investor-dashboard-component />
      }
   `,
})
export class DashboardPageComponent {
   private readonly _session: SessionService = inject(SessionService);
   private readonly _panel: InvestorPanelService = inject(InvestorPanelService);

   public readonly $profile: Signal<UserProfile | undefined> = computed(() => this._session.session?.profile);

   constructor() {
      // the balance is asked again every time the panel is entered
      if (this._session.session?.profile === 'investor') this._panel.enter();
   }
}
