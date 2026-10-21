import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Movimiento, MovimientosService } from '../../services/movimientos';
import { MovimientosStore } from '../../services/movimientos-store';
import { Categoria, CategoriasService } from '../../services/categorias';
import { AddMovimiento } from '../../shared/modals/add-movimiento/add-movimiento';

@Component({
  selector: 'app-movimientos',
  imports: [
    CardModule,
    TableModule,
    InputTextModule,
    SelectModule,
    FormsModule,
    DatePipe,
    CurrencyPipe,
    ButtonModule,
    ConfirmDialogModule,
    AddMovimiento,
  ],
  providers: [ConfirmationService],
  templateUrl: './movimientos.component.html',
  styleUrl: './movimientos.component.scss',
})
export class MovimientosComponent implements OnInit {
  private readonly store = inject(MovimientosStore);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly categoriasService = inject(CategoriasService);

  /**
   * Movimientos del mes seleccionado en el filtro de periodo.
   * Es un signal derivado del `MovimientosStore`, así que la tabla se
   * actualiza sola al cambiar el mes en el select de `period-month`.
   */
  readonly movimientos = this.store.movimientosFiltrados;
  readonly cargando = this.store.cargando;
  readonly error = this.store.error;

  /** Categorías cargadas desde el backend para pintar color e icono. */
  readonly categorias = signal<Categoria[]>([]);

  /** Índice por nombre (en minúsculas) para buscar la categoría de un movimiento. */
  private readonly categoriasPorNombre = computed(
    () => new Map(this.categorias().map((c) => [c.nombre.toLowerCase(), c]))
  );

  /** Referencia a la tabla para volver a la primera página al filtrar. */
  @ViewChild('tabla') private tabla?: Table;

  /** Opciones de los selects de filtro. */
  readonly tipos = [
    { label: 'Todos', value: 'todos' },
    { label: 'Ingresos', value: 'ingreso' },
    { label: 'Gastos', value: 'gasto' },
  ];

  readonly opcionesFijo = [
    { label: 'Todos', value: 'todos' },
    { label: 'Solo fijos', value: 'fijos' },
    { label: 'No fijos', value: 'no-fijos' },
  ];

  /** Texto del buscador (descripción o categoría). */
  readonly busqueda = signal('');
  /** Filtro por tipo de movimiento. */
  readonly filtroTipo = signal<'todos' | 'ingreso' | 'gasto'>('todos');
  /** Filtro por movimientos fijos. */
  readonly filtroFijo = signal<'todos' | 'fijos' | 'no-fijos'>('todos');

  /** Movimientos del periodo que pasan por el buscador y los filtros. */
  readonly movimientosVisibles = computed<Movimiento[]>(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const tipo = this.filtroTipo();
    const fijo = this.filtroFijo();

    return this.movimientos().filter((m) => {
      if (tipo === 'ingreso' && !(m.ingreso > 0)) {
        return false;
      }
      if (tipo === 'gasto' && !(m.gasto > 0)) {
        return false;
      }
      if (fijo === 'fijos' && !m.esFijo) {
        return false;
      }
      if (fijo === 'no-fijos' && m.esFijo) {
        return false;
      }
      if (texto) {
        const contenido = `${m.descripcion ?? ''} ${m.categoria ?? ''}`.toLowerCase();
        if (!contenido.includes(texto)) {
          return false;
        }
      }
      return true;
    });
  });

  /** Indica si hay algún filtro activo. */
  readonly hayFiltros = computed(
    () =>
      this.busqueda().trim() !== '' ||
      this.filtroTipo() !== 'todos' ||
      this.filtroFijo() !== 'todos'
  );

  /** Controla la visibilidad del modal de alta/edición. */
  readonly showModal = signal(false);
  /** Movimiento que se está editando (null cuando se crea uno nuevo). */
  readonly movimientoEditando = signal<Movimiento | null>(null);

  constructor(private movimientosService: MovimientosService) {}

  ngOnInit(): void {
    // Si el store aún no tiene datos (p. ej. acceso directo), los carga.
    this.store.cargar().subscribe();
    this.cargarCategorias();
  }

  private cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (datos) => this.categorias.set(datos),
      error: (err) => console.error('Error al cargar las categorías:', err),
    });
  }

  /** Categoría asociada al nombre del movimiento (o undefined si no existe). */
  categoriaDe(nombre: string): Categoria | undefined {
    return this.categoriasPorNombre().get(nombre?.toLowerCase());
  }

  /** Color de texto legible sobre el color de fondo indicado. */
  colorTexto(color?: string): string {
    if (!color) {
      return '#ffffff';
    }
    const hex = color.replace('#', '');
    if (hex.length !== 6) {
      return '#ffffff';
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminancia > 160 ? '#1f2937' : '#ffffff';
  }

  /** Actualiza el buscador y vuelve a la primera página. */
  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
    this.resetPagina();
  }

  /** Actualiza el filtro de tipo y vuelve a la primera página. */
  onTipoChange(valor: 'todos' | 'ingreso' | 'gasto'): void {
    this.filtroTipo.set(valor);
    this.resetPagina();
  }

  /** Actualiza el filtro de fijos y vuelve a la primera página. */
  onFijoChange(valor: 'todos' | 'fijos' | 'no-fijos'): void {
    this.filtroFijo.set(valor);
    this.resetPagina();
  }

  /** Limpia buscador y filtros. */
  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroTipo.set('todos');
    this.filtroFijo.set('todos');
    this.resetPagina();
  }

  private resetPagina(): void {
    if (this.tabla) {
      this.tabla.first = 0;
    }
  }

  /**
   * Balance acumulado dentro del periodo del filtro de mes.
   * Se calcula sobre TODOS los movimientos del periodo, no sobre los
   * visibles, para que el buscador y los filtros no alteren el balance.
   */
  balanceAfter(movement: Movimiento): number {
    const index = this.movimientos().findIndex((m) => m._id === movement._id);
    return this.movimientos()
      .slice(0, index + 1)
      .reduce((sum, m) => sum + m.ingreso - m.gasto, 0);
  }

  /** Abre el modal cargando los datos del movimiento seleccionado. */
  edit(movimiento: Movimiento): void {
    this.movimientoEditando.set(movimiento);
    this.showModal.set(true);
  }

  /** Pide confirmación y elimina el movimiento en el backend. */
  deleteMovement(movimiento: Movimiento): void {
    this.confirm.confirm({
      key: 'movimientos',
      header: 'Eliminar movimiento',
      message: `¿Seguro que quieres eliminar «${movimiento.descripcion}»?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(movimiento),
    });
  }

  private eliminar(movimiento: Movimiento): void {
    this.movimientosService.eliminarMovimiento(movimiento._id).subscribe({
      next: () => {
        // Recarga desde el backend para reflejar el borrado en el store.
        this.store.cargar(true).subscribe();
        this.messages.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'El movimiento se ha eliminado correctamente.',
        });
      },
      error: (err) => {
        console.error('Error al eliminar el movimiento:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudo eliminar el movimiento.',
        });
      },
    });
  }

  /** Se invoca cuando el modal se cierra. */
  onModalClosed(): void {
    this.showModal.set(false);
    this.movimientoEditando.set(null);
  }
}
