import { CardModule } from 'primeng/card';
import { Component, inject } from '@angular/core';
import { MovimientosStore } from '../../services/movimientos-store';
import { CurrencyPipe, DecimalPipe, NgStyle } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CardModule, CurrencyPipe, DecimalPipe, NgStyle, CommonModule],
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

  /** Gastos por categoría para el gráfico (top 6). */
  get gastosPorCategoria(): Array<{ categoria: string; total: number; pct: number }> {
    const map = new Map<string, number>();
    for (const m of this.movimientos()) {
      const gasto = Number(m.gasto || 0);
      if (gasto > 0) {
        const cat = m.categoria || 'Sin categoría';
        map.set(cat, (map.get(cat) || 0) + gasto);
      }
    }
    const items = Array.from(map.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const total = items.reduce((s, i) => s + i.total, 0);
    return items.map((i) => ({
      categoria: i.categoria,
      total: i.total,
      pct: total > 0 ? (i.total / total) * 100 : 0,
    }));
  }

  get maxCategoriaPct(): number {
    const max = Math.max(...this.gastosPorCategoria.map((c) => c.pct), 0);
    return max || 1;
  }

  get totalMovimientos(): number {
    return this.totalIngresos + this.totalGastos;
  }

  get pctDonutIngresos(): number {
    const total = this.totalMovimientos;
    return total > 0 ? (this.totalIngresos / total) * 100 : 0;
  }

  get pctDonutGastos(): number {
    const total = this.totalMovimientos;
    return total > 0 ? (this.totalGastos / total) * 100 : 0;
  }

  get donutStyle(): Record<string, string> {
    const pIng = this.pctDonutIngresos;
    const pGas = this.pctDonutGastos;
    return {
      background: `conic-gradient(#16855e 0deg ${pIng * 3.6}deg, #c34b5a ${pIng * 3.6}deg ${
        pIng * 3.6 + pGas * 3.6
      }deg, #eef1f7 ${pIng * 3.6 + pGas * 3.6}deg 360deg)`,
    };
  }
}

