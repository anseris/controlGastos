import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Movimiento, MovimientosService } from '../../services/movimientos';
import { AddMovimiento } from '../../shared/modals/add-movimiento/add-movimiento';

@Component({
  selector: 'app-movimientos',
  imports: [
    CardModule,
    TableModule,
    TagModule,
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
  readonly movimientos = signal<Movimiento[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  /** Controla la visibilidad del modal de alta/edición. */
  readonly showModal = signal(false);
  /** Movimiento que se está editando (null cuando se crea uno nuevo). */
  readonly movimientoEditando = signal<Movimiento | null>(null);

  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  constructor(private movimientosService: MovimientosService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.cargando.set(true);
    this.error.set('');
    this.movimientosService.obtenerMovimientos().subscribe({
      next: (datos) => {
        this.movimientos.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar movimientos:', err);
        this.error.set('No se han podido cargar los movimientos.');
        this.cargando.set(false);
      },
    });
  }

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
        this.movimientos.update((lista) => lista.filter((m) => m._id !== movimiento._id));
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

  /** Se invoca cuando el modal guarda (alta o edición) para refrescar la lista. */
  onSaved(): void {
    this.loadData();
  }

  /** Se invoca cuando el modal se cierra. */
  onModalClosed(): void {
    this.showModal.set(false);
    this.movimientoEditando.set(null);
  }
}
