import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import {
  Categoria,
  CategoriasService,
  CrearCategoria,
  TipoCategoria,
} from '../../../services/categorias';

/** Opciones de icono. La cadena vacía representa "Sin icono". */
const ICONOS: { label: string; value: string }[] = [
  { label: 'Sin icono', value: '' },
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
  { label: 'Transporte', value: 'pi pi-truck' },
];

/** Colores disponibles para la categoría. */
const COLORES: { label: string; value: string }[] = [
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
  { label: 'Negro', value: '#1F2937' },
];

/** Tipos de categoría. El orden pone "Gasto" primero y es el valor por defecto. */
const TIPOS: { label: string; value: TipoCategoria }[] = [
  { label: 'Gasto', value: 'gasto' },
  { label: 'Ingreso', value: 'ingreso' },
];

@Component({
  selector: 'app-add-categorias',
  imports: [DialogModule, FormsModule, InputTextModule, SelectModule, ButtonModule],
  templateUrl: './add-categorias.html',
  styleUrl: './add-categorias.scss',
})
export class AddCategorias implements OnChanges {
  /** Controla la visibilidad del diálogo. */
  @Input() showModalAddCategorias = false;
  /** Categoría que se está editando. Si es `null` el modal crea una nueva. */
  @Input() categoria: Categoria | null = null;

  @Output() modalClosed = new EventEmitter<void>();
  /** Emite la categoría guardada (creada o actualizada) para refrescar la lista. */
  @Output() saved = new EventEmitter<Categoria>();

  private readonly categoriasService = inject(CategoriasService);
  private readonly messages = inject(MessageService);

  readonly iconosOptions = ICONOS;
  readonly coloresOptions = COLORES;
  readonly tipoOptions = TIPOS;

  submitted = false;
  guardando = false;

  formCategoria: {
    nombre: string;
    tipo: TipoCategoria;
    icono: string;
    color: string;
    hasIcono: boolean;
    primeraLetra: string;
  } = this.emptyForm();

  /** Indica si el modal está en modo edición. */
  get editing(): boolean {
    return !!this.categoria;
  }

  private emptyForm() {
    return {
      nombre: '',
      // Por defecto la categoría se crea como gasto.
      tipo: 'gasto' as TipoCategoria,
      // Cadena vacía = sin icono.
      icono: '',
      color: '',
      hasIcono: false,
      primeraLetra: ''
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Rellena el formulario al cambiar la categoría a editar o al abrirse el modal.
    if (changes['categoria']) {
      this.loadForm();
    } else if (changes['showModalAddCategorias']?.currentValue) {
      this.loadForm();
    }
  }

  /** Vuelca en el formulario la categoría a editar (o lo limpia si se crea). */
  private loadForm(): void {
    this.submitted = false;

    const categoria = this.categoria;
    if (!categoria) {
      this.formCategoria = this.emptyForm();
      return;
    }

    this.formCategoria = {
      nombre: categoria.nombre ?? '',
      tipo: (categoria.tipo ?? 'gasto') as TipoCategoria,
      icono: categoria.icono ?? '',
      color: categoria.color ?? '',
      hasIcono: false,
      primeraLetra: categoria.nombre.charAt(0).toUpperCase()
    };
  }

  saveCategoria(): void {
    this.submitted = true;

    // El nombre es el único campo obligatorio.
    if (!this.formCategoria.nombre.trim()) {
      return;
    }

    // Cuerpo que espera el backend (POST/PUT /api/categorias).
    const payload: CrearCategoria = {
      nombre: this.formCategoria.nombre.trim(),
      tipo: this.formCategoria.tipo,
      icono: this.formCategoria.icono,
      color: this.formCategoria.color,
      hasIcono: this.formCategoria.icono !== '' ? true : false,
      primeraLetra:  this.formCategoria.nombre.charAt(0).toUpperCase()
    };

    this.guardando = true;

    // En modo edición se actualiza la categoría existente; si no, se crea una nueva.
    const peticion$ =
      this.editing && this.categoria
        ? this.categoriasService.actualizarCategoria(this.categoria._id, payload)
        : this.categoriasService.crearCategoria(payload);

    peticion$.subscribe({
      next: (categoria) => {
        this.guardando = false;
        this.messages.add({
          severity: 'success',
          summary: this.editing ? 'Actualizada' : 'Guardada',
          detail: this.editing
            ? 'La categoría se ha actualizado correctamente.'
            : 'La categoría se ha guardado correctamente.',
        });
        this.saved.emit(categoria);
        this.closeModal();
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error al guardar la categoría:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudo guardar la categoría.',
        });
      },
    });
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
