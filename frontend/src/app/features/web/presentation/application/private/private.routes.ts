import { Routes } from '@angular/router';
import { authorizationGuard } from '../../../../data/guards/authorization.guard';
import { PATHS } from '../../../../data/repository/navigation.repository';
import { LayoutComponent } from './layout/layout.component';
import { HomePageComponent } from './pages/home/home.page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard.page.component';
import { LoansPageComponent } from './pages/loans/loans.page.component';
import { KpisPageComponent } from './pages/kpis/kpis.page.component';
import { UsersPageComponent } from './pages/users/users.page.component';
import { SettingsPageComponent } from './pages/settings/settings.page.component';
import { ProfilePageComponent } from './pages/profile/profile.page.component';

export const privateRoutes: Routes = [
   {
      path: PATHS.ROOT_RELATIVE,
      component: LayoutComponent,
      children: [
         { path: PATHS.ROOT_RELATIVE, component: HomePageComponent, canActivate: [authorizationGuard] },
         { path: PATHS.DASHBOARD, component: DashboardPageComponent, canActivate: [authorizationGuard] },
         { path: PATHS.LOANS, component: LoansPageComponent, canActivate: [authorizationGuard] },
         { path: PATHS.KPIS, component: KpisPageComponent, canActivate: [authorizationGuard] },
         { path: PATHS.USERS, component: UsersPageComponent, canActivate: [authorizationGuard] },
         { path: PATHS.SETTINGS, component: SettingsPageComponent, canActivate: [authorizationGuard] },
         { path: PATHS.PROFILE, component: ProfilePageComponent, canActivate: [authorizationGuard] },
      ],
   },
];
