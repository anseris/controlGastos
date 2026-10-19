import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ListadoCategorias } from './listado-categorias/listado-categorias';

@Component({
  selector: 'app-categorias',
  imports: [TabsModule, ButtonModule, ListadoCategorias],
  templateUrl: './categorias.html',
})
export class Categorias {

 
}
