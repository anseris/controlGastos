import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { Sidebar } from '../sidebar/sidebar';
import { PeriodMonth } from '../period-month/period-month';
import { Movimiento } from '../../services/movimientos';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, Sidebar, PeriodMonth],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  getMovimientos(movimientos: Movimiento[]) {
    let hola = movimientos
    console.log('main-layout', hola)
      
    }
}
