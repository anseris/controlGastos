import { CardModule } from 'primeng/card';
import { Component, inject } from '@angular/core';
import { MovimientosStore } from '../../services/movimientos-store';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CardModule, CurrencyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly store = inject(MovimientosStore);

  readonly movimientos = this.store.movimientosFiltrados;


  get totalIngresos(): number { return this.movimientos().reduce((sum, m) => sum + Number(m.ingreso || 0), 0); }
  get totalGastos(): number { return this.movimientos().reduce((sum, m) => sum + Number(m.gasto || 0), 0); }
  get balanceTotal(): number { return this.totalIngresos - this.totalGastos; }

  /** Suma de los gastos marcados como fijos en el periodo. */
  get totalFijos(): number {
    return this.movimientos()
      .filter((m) => m.esFijo)
      .reduce((sum, m) => sum + Number(m.gasto || 0), 0);
  }

  /** Número de movimientos fijos del periodo. */
  get countFijos(): number {
    return this.movimientos().filter((m) => m.esFijo).length;
  }
}
