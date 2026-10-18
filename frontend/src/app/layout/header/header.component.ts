import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { AddMovimiento } from '../../shared/modals/add-movimiento/add-movimiento';

@Component({
  selector: 'app-header',
  imports: [Button, AddMovimiento],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {

  showModalAddMovement = false;

openNew(): void {    
    this.showModalAddMovement = true;
  }

  returnCloseModal(): void {    
    this.showModalAddMovement = false ;
  }
}
