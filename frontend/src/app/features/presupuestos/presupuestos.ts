import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { Categoria, CategoriasService } from '../../services/categorias';
import { MovimientosStore } from '../../services/movimientos-store';
import { Presupuesto, PresupuestosService } from '../../services/presupuestos';

/** Presupuesto con los importes ya calculados para el periodo. */
interface PresupuestoCalculado {
  presupuesto: Presupuesto;
  /** % de los ingresos del periodo. */
  importeAsignado: number;
  /** Suma de gastos de las categorías configuradas. */
  importeGastado: number;
  /** importeAsignado - importeGastado (puede ser negativo). */
  importePendiente: number;
}

@Component({
  selector: 'app-presupuestos',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    MultiSelectModule,
    TableModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './presupuestos.html',
  styleUrl: './presupuestos.scss',
})
export class Presupuestos implements OnInit {
  private readonly store = inject(MovimientosStore);
  private readonly categoriasService = inject(CategoriasService);
  private readonly presupuestosService = inject(PresupuestosService);
  private readonly messages = inject(MessageService);

  /** Movimientos del periodo seleccionado (respeta el filtro de mes global). */
  private readonly movimientos = this.store.movimientosFiltrados;

  readonly presupuestos = signal<Presupuesto[]>([]);
  readonly categorias = signal<Categoria[]>([]);

  private readonly presCargando = signal(true);
  private readonly presError = signal('');
  readonly catCargando = signal(true);

  readonly cargando = computed(() => this.presCargando() || this.store.cargando());
  readonly error = computed(() => this.presError() || this.store.error());

  /** Suma de los ingresos del periodo seleccionado. */
  readonly totalIngresos = computed(() =>
    this.movimientos().reduce((suma, m) => suma + (m.ingreso || 0), 0)
  );

  /** Categorías de gasto que se pueden asignar a un presupuesto. */
  readonly categoriasGasto = computed(() =>
    this.categorias().filter((categoria) => categoria.tipo === 'gasto')
  );

  /** Suma de los porcentajes asignados (para avisar si supera el 100 %). */
  readonly totalPorcentaje = computed(() =>
    this.presupuestos().reduce((suma, p) => suma + p.porcentaje, 0)
  );

  /** Cálculo reactivo de asignado / gastado / pendiente por presupuesto. */
  readonly resumen = computed<PresupuestoCalculado[]>(() => {
    const ingresos = this.totalIngresos();
    const movimientos = this.movimientos();

    return this.presupuestos().map((presupuesto) => {
      const importeAsignado = ingresos * (presupuesto.porcentaje / 100);
      const importeGastado = movimientos
        .filter((m) => presupuesto.categorias.includes(m.categoria))
        .reduce((suma, m) => suma + (m.gasto || 0), 0);

      return {
        presupuesto,
        importeAsignado,
        importeGastado,
        importePendiente: importeAsignado - importeGastado,
      };
    });
  });

  /** Totales del periodo sumando los tres presupuestos. */
  readonly totalAsignado = computed(() =>
    this.resumen().reduce((suma, item) => suma + item.importeAsignado, 0)
  );

  readonly totalGastado = computed(() =>
    this.resumen().reduce((suma, item) => suma + item.importeGastado, 0)
  );

  readonly totalPendiente = computed(() =>
    this.resumen().reduce((suma, item) => suma + item.importePendiente, 0)
  );

  /** Presupuesto cuya tabla de detalle está desplegada. */
  readonly seleccionado = signal<string | null>(null);

  readonly presupuestoSeleccionado = computed(
    () => this.presupuestos().find((p) => p.clave === this.seleccionado()) ?? null
  );

  /** Gastos del periodo que componen el presupuesto seleccionado. */
  readonly detalle = computed(() => {
    const presupuesto = this.presupuestoSeleccionado();
    if (!presupuesto) {
      return [];
    }
    return this.movimientos().filter(
      (m) => presupuesto.categorias.includes(m.categoria) && (m.gasto || 0) > 0
    );
  });

  readonly detalleTitulo = computed(() => this.presupuestoSeleccionado()?.nombre ?? '');

  readonly totalDetalle = computed(() =>
    this.detalle().reduce((suma, m) => suma + (m.gasto || 0), 0)
  );

  seleccionar(clave: string): void {
    this.seleccionado.update((actual) => (actual === clave ? null : clave));
  }

  cerrarDetalle(): void {
    this.seleccionado.set(null);
  }

  // --- Estado del modal de edición ---
  showEdit = false;
  guardando = false;
  readonly editando = signal<Presupuesto | null>(null);
  editPorcentaje = 33.3;
  editCategorias: string[] = [];

  ngOnInit(): void {
    // Asegura los movimientos del periodo (respeta el filtro de mes global).
    this.store.cargar().subscribe();
    this.loadPresupuestos();
    this.loadCategorias();
  }

  private loadPresupuestos(): void {
    this.presCargando.set(true);
    this.presError.set('');
    this.presupuestosService.obtenerPresupuestos().subscribe({
      next: (datos) => {
        this.presupuestos.set(datos);
        this.presCargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar presupuestos:', err);
        this.presError.set('No se han podido cargar los presupuestos.');
        this.presCargando.set(false);
      },
    });
  }

  private loadCategorias(): void {
    this.catCargando.set(true);
    this.categoriasService.obtenerCategorias().subscribe({
      next: (datos) => {
        this.categorias.set(datos);
        this.catCargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.catCargando.set(false);
      },
    });
  }

  /** Abre el modal de edición con los valores actuales del presupuesto. */
  abrirEdicion(presupuesto: Presupuesto): void {
    this.editando.set(presupuesto);
    this.editPorcentaje = presupuesto.porcentaje;
    this.editCategorias = [...presupuesto.categorias];
    this.showEdit = true;
  }

  cerrarEdicion(): void {
    this.showEdit = false;
    this.editando.set(null);
    this.guardando = false;
  }

  /** Guarda el porcentaje y las categorías configuradas en el backend. */
  guardarEdicion(): void {
    const presupuesto = this.editando();
    if (!presupuesto) {
      return;
    }

    const porcentaje = Math.min(100, Math.max(0, Number(this.editPorcentaje) || 0));

    this.guardando = true;
    this.presupuestosService
      .actualizarPresupuesto(presupuesto.clave, {
        porcentaje,
        categorias: [...this.editCategorias],
      })
      .subscribe({
        next: (actualizado) => {
          this.presupuestos.update((lista) =>
            lista.map((p) => (p.clave === actualizado.clave ? actualizado : p))
          );
          this.guardando = false;
          this.showEdit = false;
          this.editando.set(null);
          this.messages.add({
            severity: 'success',
            summary: 'Guardado',
            detail: `Presupuesto «${actualizado.nombre}» actualizado.`,
          });
        },
        error: (err) => {
          this.guardando = false;
          console.error('Error al guardar el presupuesto:', err);
          this.messages.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.mensaje ?? 'No se pudo guardar el presupuesto.',
          });
        },
      });
  }

  /** % del importe asignado que ya se ha gastado (para la barra de progreso). */
  porcentajeGastado(item: PresupuestoCalculado): number {
    if (item.importeAsignado <= 0) {
      return 0;
    }
    return Math.min(100, (item.importeGastado / item.importeAsignado) * 100);
  }

  iconFor(clave: string): string {
    switch (clave) {
      case 'casa':
        return 'pi pi-home';
      case 'ahorro':
        return 'pi pi-wallet';
      case 'para-mi':
        return 'pi pi-heart';
      default:
        return 'pi pi-wallet';
    }
  }

  colorFor(clave: string): string {
    switch (clave) {
      case 'casa':
        return '#3B82F6';
      case 'ahorro':
        return '#22C55E';
      case 'para-mi':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  }
}
