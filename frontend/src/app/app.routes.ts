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
        path: 'resumen-mensual',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'mis-bancos',
        loadComponent: () => import('./features/mis-bancos/mis-bancos').then((m) => m.MisBancos),
      },
      {
        path: 'categorias',
        loadComponent: () => import('./features/categorias/categorias').then((m) => m.Categorias),
      },
      {
        path: 'presupuestos',
        loadComponent: () => import('./features/presupuestos/presupuestos').then((m) => m.Presupuestos),
      },
      {
        path: 'resumen-anual',
        loadComponent: () =>
          import('./features/resumen-anual/resumen-anual').then((m) => m.ResumenAnual),
      },
      {
        path: 'resumen-anual/opcion1',
        loadComponent: () =>
          import('./features/resumen-anual/opcion1/opcion1').then((m) => m.Opcion1),
      },
      {
        path: 'resumen-anual/opcion2',
        loadComponent: () =>
          import('./features/resumen-anual/opcion2/opcion2').then((m) => m.Opcion2),
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

