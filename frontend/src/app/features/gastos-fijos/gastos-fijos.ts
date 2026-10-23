import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { AddGastoFijo } from '../../shared/modals/add-gasto-fijo/add-gasto-fijo';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GastoFijo, GastosFijosService } from '../../services/gastos-fijos';
import { Categoria, CategoriasService } from '../../services/categorias';
import { MovimientosStore } from '../../services/movimientos-store';

@Component({
  selector: 'app-gastos-fijos',
  imports: [
    ButtonModule,
    TagModule,
    SelectModule,
    FormsModule,
    CurrencyPipe,
    ConfirmDialogModule,
    AddGastoFijo,
  ],
  providers: [ConfirmationService],
  templateUrl: './gastos-fijos.html',
  styleUrl: './gastos-fijos.scss',
})
export class GastosFijos implements OnInit {
  private readonly gastosFijosService = inject(GastosFijosService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly store = inject(MovimientosStore);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  /** Gastos fijos guardados en la BBDD. */
  readonly gastosFijos = this.gastosFijosService.gastosFijos;
  readonly cargando = this.gastosFijosService.cargando;
  readonly error = this.gastosFijosService.error;

  /** Categorías para pintar el color e icono de cada card. */
  readonly categorias = signal<Categoria[]>([]);

  /** Controla la visibilidad del modal de alta/edición. */
  readonly showModal = signal(false);
  /** Gasto fijo que se está editando (null cuando se crea uno nuevo). */
  readonly gastoFijoEditando = signal<GastoFijo | null>(null);

  /** Indica si se está generando los movimientos del mes. */
  readonly generando = signal(false);

  /** Suma de todos los gastos fijos activos (coste mensual). */
  readonly totalMensual = computed(() =>
    this.gastosFijos()
      .filter((gasto) => gasto.activo)
      .reduce((suma, gasto) => suma + (gasto.importe ?? 0), 0),
  );

  /** Número de gastos fijos activos. */
  readonly totalActivos = computed(() => this.gastosFijos().filter((gasto) => gasto.activo).length);

  /** Categoría associated a un gasto fijo (para el color e icono de la card). */
  private readonly categoriasPorNombre = computed(
    () => new Map(this.categorias().map((c) => [c.nombre.toLowerCase(), c])),
  );

  ngOnInit(): void {
    this.gastosFijosService.cargar().subscribe();
    this.cargarCategorias();
  }

  private cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (datos) => this.categorias.set(datos),
      error: (err) => console.error('Error al cargar las categorías:', err),
    });
  }

  /** Categoría de un gasto fijo (o undefined si no existe). */
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

  /** Abre el modal para crear un gasto fijo nuevo. */
  anadirGastoFijo(): void {
    this.gastoFijoEditando.set(null);
    this.showModal.set(true);
  }

  /** Abre el modal cargando los datos del gasto fijo seleccionado. */
  editarGastoFijo(gastoFijo: GastoFijo): void {
    this.gastoFijoEditando.set(gastoFijo);
    this.showModal.set(true);
  }

  /** Pide confirmación y elimina el gasto fijo en el backend. */
  eliminarGastoFijo(gastoFijo: GastoFijo): void {
    this.confirm.confirm({
      key: 'gastos-fijos',
      header: 'Eliminar gasto fijo',
      message: `¿Seguro que quieres eliminar «${gastoFijo.descripcion}»? Los movimientos ya generados no se borrarán.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(gastoFijo),
    });
  }

  private eliminar(gastoFijo: GastoFijo): void {
    this.gastosFijosService.eliminar(gastoFijo._id).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'El gasto fijo se ha eliminado correctamente.',
        });
      },
      error: (err) => {
        console.error('Error al eliminar el gasto fijo:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudo eliminar el gasto fijo.',
        });
      },
    });
  }

  /**
   * Genera manualmente los movimientos del mes actual para los gastos fijos
   * activos que todavía no los tienen (el backend también lo hace solo).
   */
  generarMovimientos(): void {
    this.generando.set(true);

    this.gastosFijosService.generarMovimientos().subscribe({
      next: (resultado) => {
        this.generando.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Movimientos generados',
          detail: resultado.mensaje,
        });
        // Recarga los movimientos para que la tabla los muestre.
        this.store.cargar(true).subscribe();
      },
      error: (err) => {
        this.generando.set(false);
        console.error('Error al generar los movimientos:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudieron generar los movimientos.',
        });
      },
    });
  }

  /** Se invoca cuando el modal guarda (alta o edición) para refrescar la lista. */
  onSaved(): void {
    this.gastosFijosService.cargar(true).subscribe();
  }

  /** Se invoca cuando el modal se cierra. */
  returnCloseModal(): void {
    this.showModal.set(false);
    this.gastoFijoEditando.set(null);
  }
}
