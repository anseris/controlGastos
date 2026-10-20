import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ListadoCategorias } from './listado-categorias/listado-categorias';
import { ResumenCategorias } from './resumen-categorias/resumen-categorias';

@Component({
  selector: 'app-categorias',
  imports: [TabsModule, ButtonModule, ListadoCategorias,ResumenCategorias],
  templateUrl: './categorias.html',
})
export class Categorias {

  

 
}
