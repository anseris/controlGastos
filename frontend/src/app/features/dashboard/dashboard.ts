import { CardModule } from 'primeng/card';
import { Component, inject } from '@angular/core';
import { MovimientosStore } from '../../services/movimientos-store';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CardModule, CurrencyPipe, DecimalPipe],
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

  /** Porcentaje de un importe respecto a los ingresos totales. */
  private porcentajeIngresos(valor: number): number {
    const ingresos = this.totalIngresos;
    return ingresos > 0 ? (valor / ingresos) * 100 : 0;
  }

  get pctIngresos(): number {
    return this.totalIngresos > 0 ? 100 : 0;
  }

  get pctGastos(): number {
    return this.porcentajeIngresos(this.totalGastos);
  }

  get pctBalance(): number {
    return this.porcentajeIngresos(this.balanceTotal);
  }

  get pctFijos(): number {
    return this.porcentajeIngresos(this.totalFijos);
  }

  /** Ancho de la barra acotado entre 0 y 100 %. */
  barraPct(porcentaje: number): number {
    return Math.min(100, Math.max(0, porcentaje));
  }
}
