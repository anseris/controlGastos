import { Component, ViewEncapsulation } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';

@Component({
  selector: 'app-sidebar',
  imports: [MenubarModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Sidebar {
  readonly items: MenuItem[] = [
    {
      label: 'Movimientos',
      icon: 'pi pi-list',
      routerLink: '/movimientos',
    },
    {
      label: 'Presupuestos',
      icon: 'pi pi-euro',
      routerLink: '/presupuestos',
    },
    {
      label: 'Gastos Fijos',
      icon: 'pi pi-thumbtack',
      routerLink: '/gastos-fijos',
    },
    {
      label: 'Resúmenes',
      icon: 'pi pi-chart-bar',
      items: [
        {
          label: 'Mensual',
          routerLink: '/dashboard/resumen-mensual',
        },
        {
          label: 'Anual',
          routerLink: '/dashboard/resumen-anual',
        },
      ],
    },
    {
      label: 'Cuentas',
      icon: 'pi pi-money-bill',
      items: [
        {
          label: 'Mis cuentas',
          routerLink: '/mis-bancos/cuentas',
        },
        {
          label: 'Préstamo',
          routerLink: '/mis-bancos/prestamo',
        },
      ],
    },
    {
      label: 'Categorías',
      icon: 'pi pi-tags',
      items: [
        {
          label: 'Resumen',
          routerLink: '/categorias/resumen',
        },
        {
          label: 'Listado',
          routerLink: '/categorias/listado',
        },
      ],
    },
  ];
}
