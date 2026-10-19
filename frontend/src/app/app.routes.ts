import { Routes } from '@angular/router';
import { publicRoutes } from './features/web/presentation/application/public/public.routes';
import { PATHS } from './features/data/repository/navigation.repository';
import { authenticationGuard } from './features/data/guards/authentication.guard';
import { privateRoutes } from './features/web/presentation/application/private/private.routes';

export const routes: Routes = [
   { path: PATHS.ROOT_RELATIVE, children: publicRoutes },
   {
      path: PATHS.APP,
      canActivate: [authenticationGuard],
      canActivateChild: [authenticationGuard],
      children: privateRoutes,
   },
   { path: PATHS.ALL_ROUTES, redirectTo: PATHS.ROOT_RELATIVE },
];
