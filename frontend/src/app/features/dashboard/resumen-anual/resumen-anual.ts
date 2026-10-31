import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ChartData, ChartOptions } from 'chart.js';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { CategoriasService, type Categoria } from '../../../services/categorias';
import { MovimientosStore } from '../../../services/movimientos-store';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const COLORES_CATEGORIA = [
  '#4169e1',
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
];

interface AnioOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-resumen-anual',
  imports: [CardModule, ChartModule, SelectModule, FormsModule],
  templateUrl: './resumen-anual.html',
  styleUrl: './resumen-anual.scss',
})
export class ResumenAnual implements OnInit {
  private readonly store = inject(MovimientosStore);
  private readonly categoriasService = inject(CategoriasService);

  readonly anioSeleccionado = signal(new Date().getFullYear());
  readonly categorias = signal<Categoria[]>([]);
  readonly errorCategorias = signal('');

  readonly movimientos = this.store.movimientos;
  readonly cargando = this.store.cargando;
  readonly errorMovimientos = this.store.error;

  readonly aniosDisponibles = computed<AnioOption[]>(() => {
    const anios = new Set<number>([new Date().getFullYear()]);
    for (const movimiento of this.movimientos()) {
      const anio = Number(movimiento.fecha.slice(0, 4));
      if (Number.isInteger(anio) && anio > 0) {
        anios.add(anio);
      }
    }

    return [...anios]
      .sort((a, b) => b - a)
      .map((anio) => ({ label: String(anio), value: anio }));
  });

  readonly movimientosDelAnio = computed(() => {
    const anio = String(this.anioSeleccionado());
    return this.movimientos().filter((movimiento) => movimiento.fecha.slice(0, 4) === anio);
  });

  readonly datosGrafico = computed<ChartData<'bar', number[], string>>(() => {
    const gastosPorCategoria = new Map<string, number[]>();

    for (const movimiento of this.movimientosDelAnio()) {
      const gasto = Number(movimiento.gasto || 0);
      const mes = Number(movimiento.fecha.slice(5, 7)) - 1;
      if (
        movimiento.tipo !== 'gasto' ||
        !Number.isFinite(gasto) ||
        gasto <= 0 ||
        !Number.isInteger(mes) ||
        mes < 0 ||
        mes > 11
      ) {
        continue;
      }

      const categoria = movimiento.categoria?.trim() || 'Sin categoría';
      const gastosMensuales = gastosPorCategoria.get(categoria) ?? Array<number>(12).fill(0);
      gastosMensuales[mes] += gasto;
      gastosPorCategoria.set(categoria, gastosMensuales);
    }

    const coloresConfigurados = new Map(
      this.categorias()
        .filter((categoria) => categoria.tipo === 'gasto')
        .map((categoria) => [categoria.nombre, categoria.color]),
    );
    const categoriasOrdenadas = [...gastosPorCategoria.entries()].sort(([a], [b]) =>
      a.localeCompare(b, 'es'),
    );

    return {
      labels: MESES,
      datasets: categoriasOrdenadas.map(([categoria, data], index) => {
        const color =
          coloresConfigurados.get(categoria) || COLORES_CATEGORIA[index % COLORES_CATEGORIA.length];
        return {
          label: categoria,
          data,
          backgroundColor: color,
          borderColor: color,
          borderRadius: 4,
          maxBarThickness: 36,
        };
      }),
    };
  });

  readonly opcionesGrafico: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 18,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(Number(context.raw))}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
      },
      y: {
        stacked: true,
        min: 0,
        max: 3000,
        ticks: {
          stepSize: 200,
          autoSkip: false,
          callback: (value) =>
            new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(Number(value)),
        },
      },
    },
  };

  ngOnInit(): void {
    this.store.cargar().subscribe({
      error: (error: unknown) => console.error('Error al cargar movimientos del resumen anual:', error),
    });
    this.categoriasService.obtenerCategorias().subscribe({
      next: (categorias) => this.categorias.set(categorias),
      error: (error: unknown) => {
        console.error('Error al cargar categorías para el resumen anual:', error);
        this.errorCategorias.set('No se pudieron cargar los colores de las categorías.');
      },
    });
  }
}
