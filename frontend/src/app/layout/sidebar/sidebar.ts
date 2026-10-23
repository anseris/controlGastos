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
  menus = {
    resumenAnual: false,
    categorias: false,
    cuentas: false,
    resumen: false,
  };

  toggleMenu(menu: keyof Sidebar['menus']): void {
    this.menus[menu] = !this.menus[menu];
  }
}
