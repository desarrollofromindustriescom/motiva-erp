import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FOOTER_I18N_KEYS } from '../../../../../data/repository/layout.repository';

@Component({
   selector: 'fi-footer-component',
   imports: [TranslatePipe],
   template: `
      <footer class="w-full flex items-center justify-center gap-1 text-main h-12 text-xs sm:text-base transition-all">
         {{ I18N.BUILD_BY | translate }} <b>{{ I18N.BUSINESS | translate }}</b>
      </footer>
   `,
})
export class FooterComponent {
   public readonly I18N = FOOTER_I18N_KEYS;
}
