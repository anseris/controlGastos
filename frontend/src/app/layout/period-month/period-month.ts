import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Movimiento } from '../../services/movimientos';
import { MovimientosStore, mesLabel } from '../../services/movimientos-store';
import { ButtonModule } from 'primeng/button';
import { AddMovimiento } from '../../shared/modals/add-movimiento/add-movimiento';

@Component({
  selector: 'app-period-month',
  imports: [SelectModule, FormsModule, ButtonModule, AddMovimiento],
  templateUrl: './period-month.html',
  styleUrl: './period-month.scss',
})
export class PeriodMonth implements OnInit {
  /**
   * Emite los movimientos del mes seleccionado.
   * Se mantiene para compatibilidad; para compartir el estado con cualquier
   * componente es preferible inyectar `MovimientosStore` y leer
   * `movimientosFiltrados()`.
   */
  @Output() getMovimientos = new EventEmitter<Movimiento[]>();

  private readonly store = inject(MovimientosStore);

  /** Opciones del select (meses recuperados de la BBDD). */
  readonly monthOptions = this.store.mesOptions;
  /** Mes seleccionado (`aaaa-mm` o 'all'). */
  readonly selectedMonth = this.store.mesSeleccionado;

  showModalAddMovement = false;

  ngOnInit(): void {
    // Carga los movimientos y, al terminar, emite el mes más reciente seleccionado.
    this.store.cargar().subscribe({
      next: () => this.emitirFiltrados(),
      error: () => {
        /* el store ya guarda el mensaje de error */
      },
    });
  }

  /** Se ejecuta al cambiar el mes en el select. */
  onMesChange(mes: string): void {
    this.store.seleccionarMes(mes);
    this.emitirFiltrados();
  }

  /** Etiqueta legible de un mes (`aaaa-mm`). */
  monthLabel(value: string): string {
    return mesLabel(value).charAt(0).toUpperCase() + mesLabel(value).slice(1);
  }

  openNew(): void {
    this.showModalAddMovement = true;
  }

  returnCloseModal(): void {
    this.showModalAddMovement = false;
  }

  private emitirFiltrados(): void {
    this.getMovimientos.emit(this.store.movimientosFiltrados());
  }
}
