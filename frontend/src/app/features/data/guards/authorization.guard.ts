import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { SessionService } from '../services/session.service';
import { NavigationService } from '../services/navigation.service';
import { ApplicationModule } from '../../../interfaces/navigation';
import { PATHS } from '../repository/navigation.repository';
import { Session } from '../../../interfaces/session';

export const authorizationGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
   const _router: Router = inject(Router);
   const _session: SessionService = inject(SessionService);
   const _navigation: NavigationService = inject(NavigationService);

   const session: Session | null = _session.session;
   if (!session) return _router.createUrlTree([PATHS.ROOT]);

   let path: string = PATHS.ROOT_RELATIVE;
   if (route.routeConfig && route.routeConfig.path) path = route.routeConfig.path;

   const module: ApplicationModule | undefined = _navigation.navRoutesBuffer[path];
   if (!module) return true;

   return !_navigation.navModulesBuffer[module].allowed[session.profile]
      ? _router.createUrlTree([PATHS.ROOT, PATHS.APP])
      : true;
};
