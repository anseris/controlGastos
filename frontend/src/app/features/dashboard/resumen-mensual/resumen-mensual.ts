import { CommonModule, CurrencyPipe, DecimalPipe, NgStyle } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { MovimientosStore } from '../../../services/movimientos-store';
import { DividerModule } from 'primeng/divider';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

/** Colores del donut, en el mismo orden que las categorías (de mayor a menor gasto). */
const COLORES_CATEGORIA = [
  '#4f7cff',
  '#c34b5a',
  '#16855e',
  '#b45309',
  '#8b5cf6',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#eab308',
  '#7c3aed',
  '#f97316',
  '#64748b',
] as const;

@Component({
  selector: 'app-resumen-mensual',
  imports: [
    CardModule,
    CurrencyPipe,
    DecimalPipe,
    NgStyle,
    CommonModule,
    DividerModule,
    ButtonModule,
  ],
  templateUrl: './resumen-mensual.html',
  styleUrl: './resumen-mensual.scss',
})
export class ResumenMensual {
  private readonly store = inject(MovimientosStore);
  private router = inject(Router);

  readonly movimientos = this.store.movimientosFiltrados;

  get totalIngresos(): number {
    return this.movimientos().reduce((sum, m) => sum + Number(m.ingreso || 0), 0);
  }
  get totalGastos(): number {
    return this.movimientos().reduce((sum, m) => sum + Number(m.gasto || 0), 0);
  }
  get balanceTotal(): number {
    return this.totalIngresos - this.totalGastos;
  }

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

  /**
   * Gastos por categoría del periodo.
   * Salen todas las categorías que tienen algún gasto este mes.
   */
  get gastosPorCategoria(): Array<{
    categoria: string;
    total: number;
    pct: number;
    color: string;
  }> {
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
      .sort((a, b) => b.total - a.total);

    const total = items.reduce((suma, item) => suma + item.total, 0);

    return items.map((item, index) => ({
      categoria: item.categoria,
      total: item.total,
      pct: total > 0 ? (item.total / total) * 100 : 0,
      color: COLORES_CATEGORIA[index % COLORES_CATEGORIA.length] as string,
    }));
  }

  /** Fondo del donut de gastos por categoría. */
  get gastosDonutStyle(): Record<string, string> {
    const categorias = this.gastosPorCategoria;

    if (categorias.length === 0) {
      return {};
    }

    let angulo = 0;
    const segmentos = categorias.map((categoria, index) => {
      const inicio = angulo;
      angulo += categoria.pct * 3.6;
      // El último tramo termina en 360° para evitar huecos por redondeo.
      const fin = index === categorias.length - 1 ? 360 : angulo;
      return `${categoria.color} ${inicio}deg ${fin}deg`;
    });

    return { background: `conic-gradient(${segmentos.join(', ')})` };
  }

  /** Importe gastado del periodo (parte roja del donut). */
  get totalGastado(): number {
    return this.totalGastos;
  }

  /** Parte de los ingresos que todavía no se ha gastado. */
  get totalPendiente(): number {
    const pendiente = this.totalIngresos - this.totalGastos;
    return pendiente > 0 ? pendiente : 0;
  }

  /** Base del donut: gastado + pendiente. */
  get totalDonut(): number {
    const total = this.totalGastado + this.totalPendiente;
    return total > 0 ? total : 1;
  }

  get pctDonutGastado(): number {
    return (this.totalGastado / this.totalDonut) * 100;
  }

  get pctDonutPendiente(): number {
    return (this.totalPendiente / this.totalDonut) * 100;
  }

  /** Fondo del donut: gastado (rojo) + pendiente (verde). */
  get donutStyle(): Record<string, string> {
    const anguloGastado = this.pctDonutGastado * 3.6;
    const anguloPendiente = this.pctDonutPendiente * 3.6;
    const fondo =
      'conic-gradient(#c34b5a 0deg ' +
      anguloGastado +
      'deg, #22c55e ' +
      anguloGastado +
      'deg ' +
      (anguloGastado + anguloPendiente) +
      'deg)';

    return { background: fondo };
  }

  irAGastosFijos(): void {
    this.router.navigate(['/gastos-fijos']);
  }
}
