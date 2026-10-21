import { DialogModule } from 'primeng/dialog';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
} from '@angular/core';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { Observable, of } from 'rxjs';
import { CrearMovimiento, Movimiento, MovimientosService } from '../../../services/movimientos';
import { MovimientosStore } from '../../../services/movimientos-store';
import { CategoriasService } from '../../../services/categorias';
import { BancosService } from '../../../services/bancos';

// const CATEGORIAS = [
//   'Sueldo', 'Otros ingresos', 'Casa', 'Prestamo', 'Internet', 'Ayuntamiento', 'Luz',
//   'Ahorro', 'Tabaco', 'Comida', 'Caprichos', 'Ocio', 'Imprevistos', 'Gasolina',
//   'Otros gastos', 'Subscripciones'
// ];

const TIPO = ['Ingreso', 'Gasto'];

@Component({
  selector: 'app-add-movimiento',
  standalone: true,
  imports: [
    DialogModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    FormsModule,
    ButtonModule,
    CheckboxModule
  ],
  templateUrl: './add-movimiento.html',
  styleUrl: './add-movimiento.scss',
})
export class AddMovimiento implements OnChanges {
  /** Movimiento que se está editando. Si es `null` el modal crea uno nuevo. */
  @Input() movimiento: Movimiento | null = null;
  @Input() showModalAddMovement: boolean = false;
  @Input() esTraspaso: boolean = false;

  @Output() modalClosed = new EventEmitter<void>();
  /** Emite el movimiento guardado (creado o actualizado) para que el padre refresque la lista. */
  @Output() saved = new EventEmitter<Movimiento>();

  /** Indica si el modal está en modo edición. */
  get editing(): boolean {
    return !!this.movimiento;
  }

  private readonly movimientosService = inject(MovimientosService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly bancosService = inject(BancosService);
  private readonly movimientosStore = inject(MovimientosStore);
  private readonly messages = inject(MessageService);

  submitted = false;
  checked: boolean = false;
  guardando = false;
  tieneRedondeo = true
  categoryOptions: any = []

  // readonly categoryOptions = CATEGORIAS.map(value => ({ label: value, value }));
  readonly typeMovimiento = TIPO.map(value => ({ label: value, value }));
  /** Cuentas configuradas en Mis bancos; el valor guardado es su id (`tipoAhorro`). */
  readonly tipoAhorroOptions = computed(() =>
    this.bancosService.cuentas().map((cuenta) => ({
      label: cuenta.nombre,
      value: cuenta.id,
    }))
  );

  form: {
    fecha: Date | null;
    descripcion: string;
    categoria: string;
    tipoAhorro: string;
    ingreso: number | null;
    gasto: number | null;
    tipo: string;
    esFijo: boolean;
  } = this.emptyForm();

  private emptyForm() {
    return {
      fecha: new Date(),
      descripcion: '',
      categoria: '',
      tipoAhorro: '',
      ingreso: null as number | null,
      gasto: null as number | null,
      tipo: '',
      esFijo: false,
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Las cuentas se guardan en la BBDD: se cargan al abrir el modal.
    if (changes['movimiento'] || changes['showModalAddMovement']?.currentValue === true) {
      this.bancosService.cargar().subscribe({
        error: (err) => console.error('Error al cargar las cuentas:', err),
      });
    }

    // Rellena el formulario cuando cambia el movimiento a editar o se abre el modal.
    if (changes['movimiento']) {
      this.loadForm();
      this.loadCategorias()
    } else if (changes['showModalAddMovement'] && changes['showModalAddMovement'].currentValue) {
      this.submitted = false;
      this.loadForm();
      this.loadCategorias()
    }
  }

  /** Da formato `aaaa-mm-dd` a una fecha usando sus componentes locales (sin desplazar el día). */
  private formatFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Convierte una fecha `aaaa-mm-dd` en un `Date` local (evita el desfase de zona horaria). */
  private parseFecha(fecha: string): Date {
    const [year, month, day] = fecha.slice(0, 10).split('-').map(Number);
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  }

  /** Vuelca en el formulario los datos del movimiento a editar (o lo limpia si se crea). */
  private loadForm(): void {
    this.submitted = false;

    const movimiento = this.movimiento;
    if (!movimiento) {
      this.form = this.emptyForm();
      return;
    }

    // El backend guarda el tipo en minúsculas ('ingreso' | 'gasto').
    const tipo = (movimiento.tipo || '').toLowerCase() === 'gasto' ? 'Gasto' : 'Ingreso';

    this.form = {
      fecha: movimiento.fecha ? this.parseFecha(movimiento.fecha) : new Date(),
      descripcion: movimiento.descripcion ?? '',
      categoria: movimiento.categoria ?? '',
      tipoAhorro: movimiento.tipoAhorro ?? '',
      ingreso: tipo === 'Ingreso' ? this.movimiento?.ingreso || null : null,
      gasto: tipo === 'Gasto' ? this.movimiento?.gasto || null : null,
      tipo,
      esFijo: !!movimiento.esFijo,
    };
  }

  private loadCategorias(tipo?: string): void {
    // this.cargando.set(true);
    // this.error.set('');
    this.categoriasService.obtenerCategorias().subscribe({
      next: (datos) => {
        let datosFiltrados = datos
        if(tipo){
          datosFiltrados = datos.filter((item) => item.tipo === tipo)
        } 
        let CATEGORIAS = datosFiltrados.map(datosFiltrados => datosFiltrados.nombre);
        this.categoryOptions = CATEGORIAS.map(value => ({ label: value, value }));
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        // this.error.set('No se han podido cargar las categorías.');
        // this.cargando.set(false);
      },
    });
  }

 



  saveMovement(): void {
    this.submitted = true;

    // Validación de campos obligatorios (igual que marca la plantilla).
    if (!this.form.fecha || !this.form.descripcion.trim() || !this.form.categoria || !this.form.tipo) {
      return
    }

    const ingreso = Number(this.form.ingreso || 0);
    const gasto = Number(this.form.gasto || 0);

    if ((ingreso > 0 && gasto > 0) || (ingreso <= 0 && gasto <= 0)) {
      this.messages.add({
        severity: 'warn',
        summary: 'Importe incorrecto',
        detail: 'Introduce un ingreso o un gasto, pero no ambos.'
      });
      return;
    }

    // Cuerpo que espera el backend (POST /api/movimientos).
    const payload: CrearMovimiento = {
      // El backend guarda la fecha como string en formato `aaaa-mm-dd`.
      fecha: this.formatFecha(this.form.fecha),
      descripcion: this.form.descripcion.trim(),
      categoria: this.form.categoria,
      tipoAhorro: this.formaTipoAhorro(),
      ingreso,
      gasto,
      // El backend valida el enum en minúsculas: 'ingreso' | 'gasto'.
      tipo: this.form.tipo.toLowerCase(),
      esFijo: this.form.esFijo,
    };


    
    this.guardando = true;

    // En modo edición se actualiza el movimiento existente; si no, se crea uno nuevo.
    const peticion$ =
      this.editing && this.movimiento
        ? this.movimientosService.actualizarMovimiento(this.movimiento._id, payload)
        : this.movimientosService.crearMovimiento(payload);

    peticion$.subscribe({
      next: (movimiento) => {
        this.guardando = false;
        this.messages.add({
          severity: 'success',
          summary: this.editing ? 'Actualizado' : 'Guardado',
          detail: this.editing
            ? 'El movimiento se ha actualizado correctamente.'
            : 'El movimiento se ha guardado correctamente.'
        });

        // El redondeo (si procede) se guarda antes de recargar la lista para
        // que la tabla muestre también ese movimiento. Solo se genera al crear
        // un gasto: al editar no debe duplicarse ni sobrescribir el original.
        const redondeo$: Observable<Movimiento | null> =
          this.tieneRedondeo && !this.editing && this.form.tipo === 'Gasto'
            ? this.addRedondeo(this.form)
            : of(null);

        redondeo$.subscribe({
          next: () => this.finalizarGuardado(movimiento),
          error: (err: unknown) => {
            console.error('Error al guardar el redondeo:', err);
            // El movimiento principal ya se guardó: refrescamos igualmente.
            this.finalizarGuardado(movimiento);
          },
        });
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error al guardar el movimiento:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudo guardar el movimiento.'
        });
      }
    });
  }

  /**
   * Refresca el listado compartido y cierra el modal.
   *
   * La recarga se hace aquí (y no en cada padre) para que la tabla se
   * actualice también cuando el alta se lanza desde el botón del header.
   */
  private finalizarGuardado(movimiento: Movimiento): void {
    this.movimientosStore.cargar(true).subscribe();
    this.saved.emit(movimiento);
    this.closeModal();
  }

  onTipoChange(): void {
    let tipo = this.form.tipo.toLowerCase()
    this.loadCategorias(tipo)
    if (this.form.tipo === 'Ingreso') {
      this.form.gasto = null;
    } else {
      this.form.ingreso = null;
    }
  }

  resetForm(): void {
    this.form = this.emptyForm();
  }

  closeModal(): void {
    this.showModalAddMovement = false;
    this.modalClosed.emit();
    this.resetForm();
    this.submitted = false;
    this.guardando = false;
  }

  /**
   * Crea el movimiento de redondeo asociado a un gasto.
   * Devuelve el observable para poder recargar la lista cuando termine.
   */
  private addRedondeo(form: {
    fecha: Date | null;
    gasto: number | null;
    ingreso: number | null;
  }): Observable<Movimiento> {
    const valor = Number(form.gasto || 0);
    const unidadSuperior = Math.ceil(valor);
    const diferencia = Math.round((unidadSuperior - valor) * 100) / 100;

    const payload: CrearMovimiento = {
      // El backend guarda la fecha como string en formato `aaaa-mm-dd`.
      fecha: form.fecha ? this.formatFecha(form.fecha) : new Date().toISOString().slice(0, 10),
      descripcion: 'Redondeo',
      categoria: 'Ahorro',
      tipoAhorro: 'ing',
      ingreso: Number(form.ingreso || 0),
      gasto: diferencia,
      // El backend valida el enum en minúsculas: 'ingreso' | 'gasto'.
      tipo: 'gasto',
      esFijo: false,
    };

    return this.movimientosService.crearMovimiento(payload);
  }

  
  /** El formulario ya guarda el id de la cuenta, que es lo que espera el backend. */
  formaTipoAhorro(): string {
    return this.form.tipoAhorro || '';
  }

  

}
