import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'movimientos' },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./features/movimientos/movimientos.component').then((m) => m.MovimientosComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'categorias',
        loadComponent: () => import('./features/categorias/categorias').then((m) => m.Categorias),
      },
      {
        path: 'resumen-mensual',
        loadComponent: () =>
          import('./features/resumen-mensual/resumen-mensual').then((m) => m.ResumenMensual),
      },
      {
        path: 'resumen-anual',
        loadComponent: () =>
          import('./features/resumen-anual/resumen-anual').then((m) => m.ResumenAnual),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/configuracion/configuracion').then((m) => m.Configuracion),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
