import { Routes } from '@angular/router';
import { publicRoutes } from './features/web/presentation/public/public.routes';
import { PATHS } from './features/data/repository/paths.repository';

export const routes: Routes = [
   { path: PATHS.ROOT_RELATIVE, children: publicRoutes },
   { path: PATHS.ALL_ROUTES, redirectTo: PATHS.ROOT_RELATIVE },
];
