import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ListadoCategorias } from './listado-categorias/listado-categorias';

@Component({
  selector: 'app-configuracion',
  imports: [TabsModule, ButtonModule, ListadoCategorias],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss',
})
export class Configuracion {}
