import { Routes } from '@angular/router';
import { publicRoutes } from './features/web/presentation/public/public.routes';

export const routes: Routes = [
   { path: '', children: publicRoutes },
   { path: '**', redirectTo: '' },
];
