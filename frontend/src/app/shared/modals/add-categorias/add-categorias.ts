import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MovimientosService } from '../../../services/movimientos';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-add-categorias',
  imports: [DialogModule, FormsModule, InputTextModule, SelectModule],
  templateUrl: './add-categorias.html',
  styleUrl: './add-categorias.scss',
})
export class AddCategorias {
   /** Movimiento que se está editando. Si es `null` el modal crea uno nuevo. */
  @Input() showModalAddCategorias: boolean = false;
  @Input() categoria: any | null = null;

  @Output() modalClosed = new EventEmitter<void>();

  readonly iconosOptions = [
  { label: 'Casa', value: 'pi pi-home' },
  { label: 'Sueldo', value: 'pi pi-briefcase' },
  { label: 'Dinero', value: 'pi pi-wallet' },
  { label: 'Tarjeta', value: 'pi pi-credit-card' },
  { label: 'Internet', value: 'pi pi-wifi' },
  { label: 'Ayuntamiento', value: 'pi pi-building' },
  { label: 'Electricidad', value: 'pi pi-bolt' },
  { label: 'Ahorro', value: 'pi pi-money-bill' },
  { label: 'Comida', value: 'pi pi-shopping-cart' },
  { label: 'Regalo', value: 'pi pi-gift' },
  { label: 'Ocio', value: 'pi pi-ticket' },
  { label: 'Imprevistos', value: 'pi pi-exclamation-triangle' },
  { label: 'Coche', value: 'pi pi-car' },
  { label: 'Otros gastos', value: 'pi pi-receipt' },
  { label: 'Suscripciones', value: 'pi pi-sync' },
  { label: 'Salud', value: 'pi pi-heart' },
  { label: 'Viajes', value: 'pi pi-globe' },
  { label: 'Compras', value: 'pi pi-shopping-bag' },
  { label: 'Educación', value: 'pi pi-book' },
  { label: 'Transporte', value: 'pi pi-truck' }
];

readonly coloresOptions = [
  { label: 'Rojo', value: '#EF4444' },
  { label: 'Naranja', value: '#F97316' },
  { label: 'Amarillo', value: '#EAB308' },
  { label: 'Verde', value: '#22C55E' },
  { label: 'Turquesa', value: '#14B8A6' },
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Morado', value: '#8B5CF6' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Marrón', value: '#A16207' },
  { label: 'Gris', value: '#6B7280' },
  { label: 'Negro', value: '#1F2937' }
];

  //TODO
  /** Emite el movimiento guardado (creado o actualizado) para que el padre refresque la lista. */
  // @Output() saved = new EventEmitter<Movimiento>();

  //TODO
  /** Indica si el modal está en modo edición. */
  get editing(): boolean {
    return !!this.categoria;
  }


  //TODO
  // private readonly movimientosService = inject(MovimientosService);
  private readonly messages = inject(MessageService);

  submitted = false;
  checked: boolean = false;
  guardando = false;


  //TODO
  // readonly categoryOptions = CATEGORIAS.map(value => ({ label: value, value }));
  // readonly typeMovimiento = TIPO.map(value => ({ label: value, value }));

  formCategoria: {
    nombre: string;
    icono: string;
    color: string;
  } = this.emptyForm();

  private emptyForm() {
    return {
      nombre: '',
      icono: '',
      color: '',
    };
  }
  //TODO
  // ngOnChanges(changes: SimpleChanges): void {
  //   // Rellena el formulario cuando cambia el movimiento a editar o se abre el modal.
  //   if (changes['movimiento']) {
  //     this.loadForm();
  //   } else if (changes['showModalAddMovement'] && changes['showModalAddMovement'].currentValue) {
  //     this.submitted = false;
  //     this.loadForm();
  //   }
  // }


 
  //TODO
  /** Vuelca en el formulario los datos del movimiento a editar (o lo limpia si se crea). */
  // private loadForm(): void {
  //   this.submitted = false;

  //   const movimiento = this.movimiento;
  //   if (!movimiento) {
  //     this.form = this.emptyForm();
  //     return;
  //   }

  //   // El backend guarda el tipo en minúsculas ('ingreso' | 'gasto').
  //   const tipo = (movimiento.tipo || '').toLowerCase() === 'gasto' ? 'Gasto' : 'Ingreso';

  //   this.form = {
  //     fecha: movimiento.fecha ? this.parseFecha(movimiento.fecha) : new Date(),
  //     descripcion: movimiento.descripcion ?? '',
  //     categoria: movimiento.categoria ?? '',
  //     ingreso: tipo === 'Ingreso' ? this.movimiento?.ingreso || null : null,
  //     gasto: tipo === 'Gasto' ? this.movimiento?.gasto || null : null,
  //     tipo,
  //     esFijo: !!movimiento.esFijo,
  //   };
  // }

  saveCategoria(): void {
    this.submitted = true;

    // Validación de campos obligatorios (igual que marca la plantilla).
    if (!this.formCategoria.nombre.trim() || !this.formCategoria.icono.trim() || !this.formCategoria.color.trim()) {
      return
    }
    
    //TODO
    // Cuerpo que espera el backend (POST /api/movimientos).
    // const payload: CrearMovimiento = {
    //   // El backend guarda la fecha como string en formato `aaaa-mm-dd`.
    //   fecha: this.formatFecha(this.form.fecha),
    //   descripcion: this.form.descripcion.trim(),
    //   categoria: this.form.categoria,
    //   ingreso,
    //   gasto,
    //   // El backend valida el enum en minúsculas: 'ingreso' | 'gasto'.
    //   tipo: this.form.tipo.toLowerCase(),
    //   esFijo: this.form.esFijo,
    // };

    // this.guardando = true;

    // // En modo edición se actualiza el movimiento existente; si no, se crea uno nuevo.
    // const peticion$ =
    //   this.editing && this.movimiento
    //     ? this.movimientosService.actualizarMovimiento(this.movimiento._id, payload)
    //     : this.movimientosService.crearMovimiento(payload);

    // peticion$.subscribe({
    //   next: (movimiento) => {
    //     this.guardando = false;
    //     this.messages.add({
    //       severity: 'success',
    //       summary: this.editing ? 'Actualizado' : 'Guardado',
    //       detail: this.editing
    //         ? 'El movimiento se ha actualizado correctamente.'
    //         : 'El movimiento se ha guardado correctamente.'
    //     });
    //     this.saved.emit(movimiento);
    //     this.closeModal();
    //   },
    //   error: (err) => {
    //     this.guardando = false;
    //     console.error('Error al guardar el movimiento:', err);
    //     this.messages.add({
    //       severity: 'error',
    //       summary: 'Error',
    //       detail: err?.error?.mensaje ?? 'No se pudo guardar el movimiento.'
    //     });
    //   }
    // });
  }


  resetForm(): void {
    this.formCategoria = this.emptyForm();
  }

  closeModal(): void {
    this.showModalAddCategorias = false;
    this.modalClosed.emit();
    this.resetForm();
    this.submitted = false;
    this.guardando = false;
  }
}
