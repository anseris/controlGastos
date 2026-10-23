import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'movimientos' },
      // MOVIMIENTOS
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./features/movimientos/movimientos.component').then(
            (m) => m.MovimientosComponent,
          ),
      },

      // RESUMENES
      {
        path: 'dashboard/resumen-mensual',
        loadComponent: () =>
          import('./features/dashboard/resumen-mensual/resumen-mensual').then(
            (m) => m.ResumenMensual,
          ),
      },
      {
        path: 'dashboard/resumen-anual',
        loadComponent: () =>
          import('./features/dashboard/resumen-anual/resumen-anual').then((m) => m.ResumenAnual),
      },

      // MIS BANCOS
      {
        path: 'mis-bancos/cuentas',
        loadComponent: () => import('./features/mis-bancos/cuentas/cuentas').then((m) => m.Cuentas),
      },
      {
        path: 'mis-bancos/prestamo',
        loadComponent: () =>
          import('./features/mis-bancos/prestamo/prestamo').then((m) => m.Prestamo),
      },

      // GASTOS FIJOS
      {
        path: 'gastos-fijos',
        loadComponent: () =>
          import('./features/gastos-fijos/gastos-fijos').then((m) => m.GastosFijos),
      },

      // CATEGORIAS
      {
        path: 'categorias/resumen',
        loadComponent: () =>
          import('./features/categorias/resumen-categorias/resumen-categorias').then(
            (m) => m.ResumenCategorias,
          ),
      },
      {
        path: 'categorias/listado',
        loadComponent: () =>
          import('./features/categorias/listado-categorias/listado-categorias').then(
            (m) => m.ListadoCategorias,
          ),
      },

      {
        path: 'presupuestos',
        loadComponent: () =>
          import('./features/presupuestos/presupuestos').then((m) => m.Presupuestos),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
