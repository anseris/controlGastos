import { Component, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menubar, MenubarModule } from 'primeng/menubar';

/** Margen para pasar del elemento padre al submenú sin que se cierre. */
const AUTO_HIDE_DELAY = 300;

@Component({
  selector: 'app-sidebar',
  imports: [MenubarModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Sidebar implements OnDestroy {
  @ViewChild(Menubar) private menubar?: Menubar;

  private temporizadorCierre?: ReturnType<typeof setTimeout>;

  /**
   * Cierra el menú cuando el puntero sale de toda la navegación.
   *
   * El cierre se retrasa para dar tiempo a pasar del elemento padre al
   * submenú (hay una separación visual entre ambos). Si el puntero vuelve
   * a entrar en el submenú, `cancelarCierre()` anula este temporizador.
   */
  programarCierre(): void {
    this.cancelarCierre();

    this.temporizadorCierre = setTimeout(() => {
      this.menubar?.hide();
      this.temporizadorCierre = undefined;
    }, AUTO_HIDE_DELAY);
  }

  /** Cancela el cierre pendiente al volver a entrar en la navegación. */
  cancelarCierre(): void {
    if (this.temporizadorCierre === undefined) {
      return;
    }

    clearTimeout(this.temporizadorCierre);
    this.temporizadorCierre = undefined;
  }

  ngOnDestroy(): void {
    this.cancelarCierre();
  }

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
