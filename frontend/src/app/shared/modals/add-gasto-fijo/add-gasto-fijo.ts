import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Categoria, CategoriasService } from '../../../services/categorias';
import {
  DatosGastoFijo,
  GastoFijo,
  GastosFijosService,
} from '../../../services/gastos-fijos';

/** Días del mes que se pueden elegir (1-31). */
const DIAS = Array.from({ length: 31 }, (_, i) => ({
  label: `Día ${i + 1}`,
  value: i + 1,
}));

/** Categoría que se usa si el usuario aún no ha configurado ninguna. */
const CATEGORIA_POR_DEFECTO = 'Otros gastos';

type FormGastoFijo = {
  dia: number;
  descripcion: string;
  categoria: string;
  importe: number | null;
};

@Component({
  selector: 'app-add-gasto-fijo',
  imports: [DialogModule, FormsModule, InputTextModule, InputNumberModule, SelectModule, ButtonModule],
  templateUrl: './add-gasto-fijo.html',
  styleUrl: './add-gasto-fijo.scss',
})
export class AddGastoFijo implements OnChanges {
  /** Controla la visibilidad del diálogo. */
  @Input() showModal = false;
  /** Gasto fijo que se está editando. Si es `null` el modal crea uno nuevo. */
  @Input() gastoFijo: GastoFijo | null = null;

  @Output() modalClosed = new EventEmitter<void>();
  /** Emite el gasto fijo guardado (creado o actualizado) para refrescar la lista. */
  @Output() saved = new EventEmitter<GastoFijo>();

  private readonly gastosFijosService = inject(GastosFijosService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly messages = inject(MessageService);

  readonly diasOptions = DIAS;

  /** Categorías de tipo gasto (las que puede usar un gasto fijo). */
  readonly categoriasOptions = signal<Categoria[]>([]);

  submitted = false;
  guardando = false;

  form: FormGastoFijo = this.emptyForm();

  /** Indica si el modal está en modo edición. */
  get editing(): boolean {
    return !!this.gastoFijo;
  }

  constructor() {
    this.cargarCategorias();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gastoFijo']) {
      this.loadForm();
    } else if (changes['showModal']?.currentValue) {
      this.submitted = false;
      this.loadForm();
    }
  }

  /** Carga las categorías de gasto para el selector. */
  private cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (datos) => {
        this.categoriasOptions.set(datos.filter((c) => c.tipo === 'gasto'));
      },
      error: (err) => console.error('Error al cargar las categorías:', err),
    });
  }

  private emptyForm(): FormGastoFijo {
    return {
      dia: 1,
      descripcion: '',
      categoria: '',
      importe: null,
    };
  }

  /** Vuelca en el formulario el gasto fijo a editar (o lo limpia si se crea). */
  private loadForm(): void {
    this.submitted = false;

    const gastoFijo = this.gastoFijo;
    if (!gastoFijo) {
      this.form = this.emptyForm();
      return;
    }

    this.form = {
      dia: gastoFijo.dia ?? 1,
      descripcion: gastoFijo.descripcion ?? '',
      categoria: gastoFijo.categoria ?? '',
      importe: gastoFijo.importe ?? null,
    };
  }

  saveGastoFijo(): void {
    this.submitted = true;

    if (!this.form.descripcion.trim()) {
      return;
    }

    if (!this.form.dia || this.form.dia < 1 || this.form.dia > 31) {
      return;
    }

    const importe = Number(this.form.importe ?? 0);
    if (importe <= 0) {
      return;
    }

    const payload: DatosGastoFijo = {
      dia: Number(this.form.dia),
      descripcion: this.form.descripcion.trim(),
      categoria: this.form.categoria.trim() || CATEGORIA_POR_DEFECTO,
      importe,
      // El tipo de movimiento siempre es gasto.
      tipo: 'gasto',
      activo: true,
    };

    this.guardando = true;

    const editando = this.gastoFijo;
    const peticion$ = editando
      ? this.gastosFijosService.actualizar(editando._id, payload)
      : this.gastosFijosService.agregar(payload);

    peticion$.subscribe({
      next: (gastoFijo) => {
        this.guardando = false;
        this.messages.add({
          severity: 'success',
          summary: this.editing ? 'Actualizado' : 'Guardado',
          detail: this.editing
            ? 'El gasto fijo se ha actualizado correctamente.'
            : 'El gasto fijo se ha guardado correctamente.',
        });
        this.saved.emit(gastoFijo);
        this.closeModal();
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error al guardar el gasto fijo:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudo guardar el gasto fijo.',
        });
      },
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.modalClosed.emit();
    this.form = this.emptyForm();
    this.submitted = false;
    this.guardando = false;
  }
}
