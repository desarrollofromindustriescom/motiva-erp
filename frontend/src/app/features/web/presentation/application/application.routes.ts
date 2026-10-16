import { Routes } from '@angular/router';
import { PATHS } from '../../../data/repository/navigation.repository';
import { LayoutComponent } from './layout/layout.component';
import { HomePageComponent } from './pages/home/home.page.component';
import { LoansPageComponent } from './pages/loans/loans.page.component';
import { KpisPageComponent } from './pages/kpis/kpis.page.component';
import { UsersPageComponent } from './pages/users/users.page.component';
import { SettingsPageComponent } from './pages/settings/settings.page.component';
import { ProfilePageComponent } from './pages/profile/profile.page.component';

export const applicationRoutes: Routes = [
   {
      path: PATHS.ROOT_RELATIVE,
      component: LayoutComponent,
      children: [
         { path: PATHS.ROOT_RELATIVE, component: HomePageComponent },
         { path: PATHS.LOANS, component: LoansPageComponent },
         { path: PATHS.KPIS, component: KpisPageComponent },
         { path: PATHS.USERS, component: UsersPageComponent },
         { path: PATHS.SETTINGS, component: SettingsPageComponent },
         { path: PATHS.PROFILE, component: ProfilePageComponent },
      ],
   },
];
