import { Routes } from '@angular/router';
import { publicRoutes } from './features/web/presentation/application/public/public.routes';
import { PATHS } from './features/data/repository/navigation.repository';
import { authenticationGuard } from './features/data/guards/authentication.guard';
import { passwordChangedGuard, passwordPendingGuard } from './features/data/guards/password.guard';
import { ChangePasswordPageComponent } from './features/web/presentation/application/private/pages/change-password/change-password.page.component';
import { privateRoutes } from './features/web/presentation/application/private/private.routes';

export const routes: Routes = [
   { path: PATHS.ROOT_RELATIVE, children: publicRoutes },
   {
      path: PATHS.APP,
      canActivate: [authenticationGuard, passwordChangedGuard],
      canActivateChild: [authenticationGuard, passwordChangedGuard],
      children: privateRoutes,
   },
   {
      path: PATHS.CHANGE_PASSWORD,
      canActivate: [authenticationGuard, passwordPendingGuard],
      component: ChangePasswordPageComponent,
   },
   { path: PATHS.ALL_ROUTES, redirectTo: PATHS.ROOT_RELATIVE },
];
