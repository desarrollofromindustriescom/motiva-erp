import { signal, WritableSignal } from '@angular/core';
import { Session, SessionLoader } from '../../../interfaces/session';
import { environment } from '../../../../environments/environment.development';

export class SessionService {
   private readonly $loader: WritableSignal<Record<SessionLoader, boolean>> = signal({
      logout: false,
      token: false,
   });
   private readonly $token: WritableSignal<string> = signal('');
   private readonly $session: WritableSignal<Session | null> = signal(null);

   private initialized_: boolean = false;

   constructor() {}

   public get loader(): Record<SessionLoader, boolean> {
      return this.$loader();
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
         this.$loader.update((prev: Record<SessionLoader, boolean>) => ({ ...prev, token: true }));
         cookieStore
            .get(environment.tokenKey)
            .then((item: CookieListItem | null) => {
               if (item && item.value) this.updateToken({ token: item.value });
               resolve();
            })
            .catch(reject)
            .finally(() => this.$loader.update((prev: Record<SessionLoader, boolean>) => ({ ...prev, token: false })));
      });
   }

   /**
    *
    */
   public clear(): void {
      this.$loader.update((prev: Record<SessionLoader, boolean>) => ({ ...prev, logout: true }));
      this.$token.set('');
      this.$session.set(null);
      cookieStore
         .delete(environment.tokenKey)
         .finally((): void =>
            this.$loader.update((prev: Record<SessionLoader, boolean>) => ({ ...prev, logout: false })),
         );
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
