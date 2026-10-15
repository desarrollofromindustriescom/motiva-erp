import { Routes } from '@angular/router';
import { LoginPageComponent } from './login/login.page.component';
import { PATHS } from '../../../data/repository/paths.repository';

export const publicRoutes: Routes = [{ path: PATHS.ROOT_RELATIVE, component: LoginPageComponent }];
