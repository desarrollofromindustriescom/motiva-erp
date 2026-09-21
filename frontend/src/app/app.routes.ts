import { Routes } from '@angular/router';
import { publicRoutes } from './features/components/public/public.routes';
import { applicationRoutes } from './features/components/application/application.routes';

export const routes: Routes = [
   { path: '', children: publicRoutes },
   { path: 'dashboard', children: applicationRoutes },
   { path: '**', redirectTo: '' },
];
