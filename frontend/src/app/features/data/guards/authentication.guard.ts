import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { SessionService } from '../services/session.service';
import { AuthenticationService } from '../services/authentication.service';
import { PATHS } from '../repository/paths.repository';

export const authenticationGuard: CanActivateFn & CanActivateChildFn = (): Promise<boolean | UrlTree> => {
   const _router: Router = inject(Router);
   const _session: SessionService = inject(SessionService);
   const _authentication: AuthenticationService = inject(AuthenticationService);

   const exit: UrlTree = _router.createUrlTree([PATHS.ROOT]);

   return _authentication
      .recoverSession({ hideError: true })
      .then((): boolean | UrlTree => (_session.token && _session.session ? true : exit))
      .catch((): UrlTree => exit);
};
