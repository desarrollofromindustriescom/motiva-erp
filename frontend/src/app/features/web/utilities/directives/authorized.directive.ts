import {
   Directive,
   effect,
   EmbeddedViewRef,
   inject,
   input,
   InputSignal,
   TemplateRef,
   ViewContainerRef,
} from '@angular/core';
import { SessionService } from '../../../data/services/session.service';
import { UserProfile } from '../../../../interfaces/user';
import { Session } from '../../../../interfaces/session';

@Directive({
   selector: '[fiAuthorized]',
   standalone: true,
})
export class AuthorizedDirective {
   private readonly _session: SessionService = inject(SessionService);
   private readonly _template: TemplateRef<unknown> = inject(TemplateRef);
   private readonly _container: ViewContainerRef = inject(ViewContainerRef);

   private view: EmbeddedViewRef<unknown> | null = null;

   public readonly $allowed: InputSignal<Partial<Record<UserProfile, boolean>>> = input.required<
      Partial<Record<UserProfile, boolean>>
   >({ alias: 'fiAuthorized' });

   constructor() {
      effect((): void => {
         const session: Session | null = this._session.session;
         const allowed: Partial<Record<UserProfile, boolean>> = this.$allowed();

         if (session && allowed[session.profile]) {
            if (!this.view) this.view = this._container.createEmbeddedView(this._template);
            return;
         }

         this._container.clear();
         this.view = null;
      });
   }
}
