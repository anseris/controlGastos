import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  menuAbierto: keyof Sidebar['menus'] | null = null;
  menus = {
    resumenAnual: false,
    categorias: false,
    cuentas: false,
    resumen: false,
  };

  toggleMenu(menu: keyof Sidebar['menus']): void {
    // Cierra todos los menús
    Object.keys(this.menus).forEach((key) => {
      this.menus[key as keyof Sidebar['menus']] = false;
    });

    // Si no estaba abierto, abre el seleccionado
    if (this.menuAbierto !== menu) {
      this.menus[menu] = true;
      this.menuAbierto = menu;
    } else {
      this.menuAbierto = null;
    }
  }
}
