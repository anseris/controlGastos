import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ListadoCategorias } from './listado-categorias/listado-categorias';
import { GastosFijos } from './gastos-fijos/gastos-fijos';
import { Prestamo } from './prestamo/prestamo';

@Component({
  selector: 'app-configuracion',
  imports: [TabsModule, ButtonModule, ListadoCategorias, GastosFijos, Prestamo],
  templateUrl: './configuracion.html',
})
export class Configuracion {}
