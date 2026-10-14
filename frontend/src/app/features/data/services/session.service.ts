import { signal, WritableSignal } from '@angular/core';
import { Session } from '../../../interfaces/session';
import { environment } from '../../../../environments/environment.development';

export class SessionService {
   private readonly $loading: WritableSignal<boolean> = signal(false);
   private readonly $token: WritableSignal<string> = signal('');
   private readonly $session: WritableSignal<Session | null> = signal(null);

   constructor() {}

   public get loading(): boolean {
      return this.$loading();
   }

   public get token(): string {
      return this.$token();
   }

   public set token(value: string) {
      this.$token.set(value);
   }

   public get session(): Session | null {
      return this.$session();
   }

   public set session(value: Session | null) {
      this.$session.set(value);
   }

   /**
    *
    */
   public init(): void {
      this.$loading.set(true);
      cookieStore
         .get(environment.tokenKey)
         .then((item: CookieListItem | null) => {
            if (item && item.value) this.$token.set(item.value);
         })
         .finally(() => this.$loading.set(false));
   }

   /**
    *
    */
   public clear(): void {
      this.$loading.set(true);
      this.$token.set('');
      this.$session.set(null);
      cookieStore.delete(environment.tokenKey).finally(() => this.$loading.set(false));
   }
}
