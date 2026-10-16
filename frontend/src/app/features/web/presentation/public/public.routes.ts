import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login/login.page.component';
import { PATHS } from '../../../data/repository/navigation.repository';

export const publicRoutes: Routes = [{ path: PATHS.ROOT_RELATIVE, component: LoginPageComponent }];
