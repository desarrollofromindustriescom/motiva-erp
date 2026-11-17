import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { SessionService } from '../services/session.service';
import { Session } from '../../../interfaces/session';
import { PATHS } from '../repository/navigation.repository';

/**
 * Guards of the same route run at the same time, so these ones ask for the
 * session themselves (the recovery in progress is shared) instead of
 * trusting that the authentication guard has already finished.
 */
const currentSession = (_authentication: AuthenticationService, _session: SessionService): Promise<Session | null> =>
   _authentication
      .recoverSession({ hideError: true })
      .catch(() => undefined)
      .then((): Session | null => _session.session);

/**
 * Keeps the user out of the app until it has changed the password it was given
 */
export const passwordChangedGuard: CanActivateFn & CanActivateChildFn = async (): Promise<boolean | UrlTree> => {
   const _router: Router = inject(Router);
   const _authentication: AuthenticationService = inject(AuthenticationService);
   const _session: SessionService = inject(SessionService);

   const session: Session | null = await currentSession(_authentication, _session);

   if (!session) return _router.createUrlTree([PATHS.ROOT]);

   return session.password_changed ? true : _router.createUrlTree([PATHS.ROOT, PATHS.CHANGE_PASSWORD]);
};

/**
 * The change password screen is only for users that still have to change it
 */
export const passwordPendingGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
   const _router: Router = inject(Router);
   const _authentication: AuthenticationService = inject(AuthenticationService);
   const _session: SessionService = inject(SessionService);

   const session: Session | null = await currentSession(_authentication, _session);

   if (!session) return _router.createUrlTree([PATHS.ROOT]);

   return session.password_changed ? _router.createUrlTree([PATHS.ROOT, PATHS.APP]) : true;
};
