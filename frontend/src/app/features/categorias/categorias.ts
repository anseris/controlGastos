import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Categoria, CategoriasService } from '../../services/categorias';
import { Movimiento } from '../../services/movimientos';
import { MovimientosStore } from '../../services/movimientos-store';
import { TableModule } from 'primeng/table';
import { CurrencyPipe, DatePipe } from '@angular/common';

/** Categoría enriquecida con los movimientos y el total del periodo. */
interface CategoriaResumen {
  categoria: Categoria;
  movimientos: Movimiento[];
  /** Suma de los importes de los movimientos de la categoría. */
  total: number;
}

@Component({
  selector: 'app-categorias',
  imports: [TableModule, ButtonModule, CurrencyPipe, DatePipe],
  templateUrl: './categorias.html',
})
export class Categorias implements OnInit {
  private readonly store = inject(MovimientosStore);
  private readonly categoriasService = inject(CategoriasService);

  /** Movimientos del periodo seleccionado (respeta el filtro de mes global). */
  private readonly movimientos = this.store.movimientosFiltrados;

  readonly categorias = signal<Categoria[]>([]);
  private readonly catCargando = signal(true);
  private readonly catError = signal('');

  /** Se muestra cargando mientras falten categorías o movimientos. */
  readonly cargando = computed(() => this.catCargando() || this.store.cargando());
  readonly error = computed(() => this.catError() || this.store.error());

  /** _id de la categoría seleccionada (para el detalle de abajo). */
  readonly seleccionada = signal<string | null>(null);

  /** Categorías con sus movimientos y su total, recalculado de forma reactiva. */
  readonly resumen = computed<CategoriaResumen[]>(() => {
    const movimientos = this.movimientos();
    return this.categorias().map((categoria) => {
      const delCategoria = movimientos.filter((m) => m.categoria === categoria.nombre);
      const total = delCategoria.reduce((suma, m) => suma + (m.ingreso || 0) + (m.gasto || 0), 0);
      return { categoria, movimientos: delCategoria, total };
    });
  });

  /** Categorías de ingreso, separadas de las de gasto. */
  readonly ingresos = computed(() =>
    this.resumen().filter((item) => item.categoria.tipo === 'ingreso'),
  );

  /** Categorías de gasto. */
  readonly gastos = computed(() =>
    this.resumen().filter((item) => item.categoria.tipo === 'gasto'),
  );

  readonly totalIngresos = computed(() =>
    this.ingresos().reduce((suma, item) => suma + item.total, 0),
  );

  readonly totalGastos = computed(() => this.gastos().reduce((suma, item) => suma + item.total, 0));

  /** Detalle de la categoría clicada (null si no hay selección). */
  readonly detalle = computed<CategoriaResumen | null>(() => {
    const id = this.seleccionada();
    if (!id) {
      return null;
    }
    return this.resumen().find((item) => item.categoria._id === id) ?? null;
  });

  ngOnInit(): void {
    // Asegura los movimientos del periodo (respeta el filtro de mes global).
    this.store.cargar().subscribe();
    this.loadCategorias();
  }

  private loadCategorias(): void {
    this.catCargando.set(true);
    this.catError.set('');
    this.categoriasService.obtenerCategorias().subscribe({
      next: (datos) => {
        this.categorias.set(datos);
        this.catCargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.catError.set('No se han podido cargar las categorías.');
        this.catCargando.set(false);
      },
    });
  }

  /** Selecciona una categoría; si ya estaba seleccionada, cierra el detalle. */
  seleccionar(categoria: Categoria): void {
    this.seleccionada.update((actual) => (actual === categoria._id ? null : categoria._id));
  }

  cerrarDetalle(): void {
    this.seleccionada.set(null);
  }
}
