import { signal, WritableSignal } from '@angular/core';
import { Session } from '../../../interfaces/session';
import { environment } from '../../../../environments/environment.development';

export class SessionService {
   private readonly $loading: WritableSignal<boolean> = signal(false);
   private readonly $token: WritableSignal<string> = signal('');
   private readonly $session: WritableSignal<Session | null> = signal(null);

   private initialized_: boolean = false;

   constructor() {}

   public get loading(): boolean {
      return this.$loading();
   }

   public get token(): string {
      return this.$token();
   }

   public get session(): Session | null {
      return this.$session();
   }

   public set session(value: Session | null) {
      this.$session.set(value);
   }

   public get initialized(): boolean {
      return this.initialized_;
   }

   /**
    *
    */
   public getTokenCookie(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
         this.$loading.set(true);
         cookieStore
            .get(environment.tokenKey)
            .then((item: CookieListItem | null) => {
               if (item && item.value) this.updateToken({ token: item.value });
               resolve();
            })
            .catch(reject)
            .finally(() => this.$loading.set(false));
      });
   }

   /**
    *
    */
   public clear(): void {
      this.$loading.set(true);
      this.$token.set('');
      this.$session.set(null);
      cookieStore.delete(environment.tokenKey).finally((): void => this.$loading.set(false));
   }

   /**
    *
    */
   public updateToken({ token, store }: { token: string; store?: boolean }): void {
      this.$token.set(token);
      this.initialized_ = true;

      if (store) cookieStore.set(environment.tokenKey, token);
   }
}
