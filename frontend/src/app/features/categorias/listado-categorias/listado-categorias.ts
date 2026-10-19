import { AddCategorias } from './../../../shared/modals/add-categorias/add-categorias';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-listado-categorias',
  imports: [ButtonModule,AddCategorias],
  templateUrl: './listado-categorias.html',
  styleUrl: './listado-categorias.scss',
})
export class ListadoCategorias {

  showModalAddCategorias = false;

anadirCategoria(): void {    
    this.showModalAddCategorias = true;
  }

  returnCloseModal(): void {    
    this.showModalAddCategorias = false ;
  }
}
