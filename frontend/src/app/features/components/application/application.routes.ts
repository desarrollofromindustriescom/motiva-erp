import { Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { Settings } from './settings/settings';

export const applicationRoutes: Routes = [
   {
      path: '',
      component: Layout,
      children: [
         {
            path: '',
            component: Settings,
         },
      ],
   },
];
