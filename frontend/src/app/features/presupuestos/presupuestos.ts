import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { BancosService, CuentaBanco } from '../../services/bancos';
import { Categoria, CategoriasService } from '../../services/categorias';
import { CrearMovimiento, MovimientosService } from '../../services/movimientos';
import { MovimientosStore } from '../../services/movimientos-store';
import { Presupuesto, PresupuestosService } from '../../services/presupuestos';

/** Presupuesto con los importes ya calculados para el period. */
interface PresupuestoCalculado {
  presupuesto: Presupuesto;
  /** % de los ingresos del periodo. */
  importeAsignado: number;
  /** Suma de gastos de las categorías configuradas. */
  importeGastado: number;
  /** Sobrante ya traspasado a una cuenta de ahorro en el periodo. */
  importeTraspasado: number;
  /** importeAsignado - importeGastado - importeTraspasado (puede ser negativo). */
  importePendiente: number;
}

/** Traspaso preparado para registrar. */
interface TraspasoPrevisto {
  presupuesto: Presupuesto;
  /** Importe a mover a la cuenta de ahorro. */
  importe: number;
  /** Cuenta de ahorro destino. */
  cuenta: CuentaBanco;
}

/** Fila editable del diálogo de traspaso (una por presupuesto). */
interface FilaTraspaso {
  presupuesto: Presupuesto;
  /** Clave de la cuenta de ahorro destino. */
  cuenta: string;
  /** Importe a traspasar (editable). */
  importe: number | null;
  /** Pendiente disponible de la card (tope del importe). */
  disponible: number;
}

@Component({
  selector: 'app-presupuestos',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    MultiSelectModule,
    SelectModule,
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
  private readonly bancosService = inject(BancosService);
  private readonly movimientosService = inject(MovimientosService);
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

  /** Cálculo reactivo de asignado / gastado / traspasado / pendiente por presupuesto. */
  readonly resumen = computed<PresupuestoCalculado[]>(() => {
    const ingresos = this.totalIngresos();
    const movimientos = this.movimientos();

    return this.presupuestos().map((presupuesto) => {
      const importeAsignado = ingresos * (presupuesto.porcentaje / 100);
      let importeGastado = 0;
      let importeTraspasado = 0;

      for (const movimiento of movimientos) {
        // Los traspasos de sobrante se atribuyen a su presupuesto de origen:
        // descuentan de su pendiente aunque no estén entre sus categorías.
        if (movimiento.presupuestoClave === presupuesto.clave) {
          importeTraspasado += movimiento.gasto || 0;
          continue;
        }
        // Los traspasos de otro presupuesto no computan como gastado.
        if (movimiento.presupuestoClave) {
          continue;
        }
        if (presupuesto.categorias.includes(movimiento.categoria)) {
          importeGastado += movimiento.gasto || 0;
        }
      }

      return {
        presupuesto,
        importeAsignado,
        importeGastado,
        importeTraspasado,
        importePendiente: importeAsignado - importeGastado - importeTraspasado,
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

  readonly totalTraspasado = computed(() =>
    this.resumen().reduce((suma, item) => suma + item.importeTraspasado, 0)
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
    return this.movimientos().filter((movimiento) => {
      // Los traspasos de este presupuesto también forman parte de su detalle.
      if (movimiento.presupuestoClave === presupuesto.clave) {
        return (movimiento.gasto || 0) > 0;
      }
      if (movimiento.presupuestoClave) {
        return false;
      }
      return presupuesto.categorias.includes(movimiento.categoria) && (movimiento.gasto || 0) > 0;
    });
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

  // --- Traspaso del sobrante a las cuentas de ahorro ---

  /** Cuentas de ahorro (los préstamos no admiten traspasos). */
  readonly cuentasAhorro = computed(() =>
    this.bancosService.cuentas().filter((cuenta) => cuenta.tipo === 'ahorro')
  );

  /** Opciones del desplegable de cuenta destino. */
  readonly cuentasAhorroOptions = computed(() =>
    this.cuentasAhorro().map((cuenta) => ({ label: cuenta.nombre, value: cuenta.id }))
  );

  /** Días del mes que se pueden elegir como umbral de traspaso. */
  readonly diasOptions = Array.from({ length: 31 }, (_, indice) => ({
    label: String(indice + 1),
    value: indice + 1,
  }));

  /** Día del mes (1-31) a partir del cual se permite traspasar el sobrante. */
  readonly diaTransferencia = signal(25);

  /** Último día guardado en el backend (para no guardar si no ha cambiado). */
  private readonly diaGuardado = signal(25);

  readonly guardandoDia = signal(false);

  /** Mes (aaaa-mm) sobre el que se calcula el traspaso; null si no hay mes concreto. */
  private readonly periodo = computed(() => {
    const mes = this.store.mesSeleccionado();
    if (!mes || mes === 'all') {
      return null;
    }
    const [year, month] = mes.split('-').map(Number);
    if (!year || !month) {
      return null;
    }
    return { year, month };
  });

  /** Día umbral aplicado al periodo (ajustado si ese mes no tiene tantos días). */
  readonly diaEnPeriodo = computed(() => {
    const periodo = this.periodo();
    if (!periodo) {
      return null;
    }
    return Math.min(this.diaTransferencia(), this.diasDelMes(periodo.year, periodo.month));
  });

  /** Fecha (aaaa-mm-dd) del umbral de traspaso en el periodo seleccionado. */
  readonly fechaTransferencia = computed(() => {
    const periodo = this.periodo();
    const dia = this.diaEnPeriodo();
    if (!periodo || !dia) {
      return null;
    }
    return `${periodo.year}-${this.pad2(periodo.month)}-${this.pad2(dia)}`;
  });

  /** Ya se ha alcanzado el día umbral: se puede traspasar el sobrante. */
  readonly transferible = computed(() => {
    const periodo = this.periodo();
    const dia = this.diaEnPeriodo();
    if (!periodo || !dia) {
      return false;
    }
    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${this.pad2(ahora.getMonth() + 1)}`;
    const mesPeriodo = `${periodo.year}-${this.pad2(periodo.month)}`;
    // Un mes ya cerrado permite traspasar su sobrante en cualquier momento.
    if (mesPeriodo < mesActual) {
      return true;
    }
    // Un mes por venir todavía no.
    if (mesPeriodo > mesActual) {
      return false;
    }
    return ahora.getDate() >= dia;
  });

  /** Diálogo de traspaso abierto. */
  showTraspaso = false;

  /** Filas editables del diálogo (una por presupuesto a traspasar). */
  readonly filasTraspaso = signal<FilaTraspaso[]>([]);

  /** Traspaso en curso. */
  readonly transferiendo = signal(false);

  ngOnInit(): void {
    // Asegura los movimientos del periodo (respeta el filtro de mes global).
    this.store.cargar().subscribe();
    this.loadPresupuestos();
    this.loadCategorias();
    // Las cuentas de ahorro son el destino de los traspasos.
    this.bancosService.cargar().subscribe();
  }

  private loadPresupuestos(): void {
    this.presCargando.set(true);
    this.presError.set('');
    this.presupuestosService.obtenerPresupuestos().subscribe({
      next: (datos) => {
        this.presupuestos.set(datos);
        const dia = datos[0]?.diaTransferencia ?? 25;
        this.diaTransferencia.set(dia);
        this.diaGuardado.set(dia);
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
      .actualizarPresupuesto(presupuesto.clave, { porcentaje, categorias: [...this.editCategorias] })
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

  /** Guarda el día umbral de traspaso (afecta a todos los presupuestos). */
  guardarDiaTransferencia(dia: number | null | undefined): void {
    const valor = Math.min(31, Math.max(1, Math.round(Number(dia) || 1)));
    this.diaTransferencia.set(valor);

    if (valor === this.diaGuardado()) {
      return;
    }

    this.guardandoDia.set(true);
    this.presupuestosService.actualizarDiaTransferencia(valor).subscribe({
      next: (lista) => {
        this.presupuestos.set(lista);
        this.diaGuardado.set(valor);
        this.guardandoDia.set(false);
      },
      error: (err) => {
        this.guardandoDia.set(false);
        this.diaTransferencia.set(this.diaGuardado());
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudo guardar el día de traspaso.',
        });
      },
    });
  }

  /** Guarda la cuenta de ahorro de destino de un presupuesto. */
  seleccionarCuenta(presupuesto: Presupuesto, cuentaId: string | null): void {
    const anterior = presupuesto.cuentaTransferencia;
    const nueva = cuentaId ?? '';

    if (anterior === nueva) {
      return;
    }

    this.presupuestos.update((lista) =>
      lista.map((p) => (p.clave === presupuesto.clave ? { ...p, cuentaTransferencia: nueva } : p))
    );

    this.presupuestosService
      .actualizarPresupuesto(presupuesto.clave, { cuentaTransferencia: nueva })
      .subscribe({
        next: (actualizado) => {
          this.presupuestos.update((lista) =>
            lista.map((p) => (p.clave === actualizado.clave ? actualizado : p))
          );
        },
        error: (err) => {
          // Se revierte el cambio para no dejar la card desincronizada.
          this.presupuestos.update((lista) =>
            lista.map((p) =>
              p.clave === presupuesto.clave ? { ...p, cuentaTransferencia: anterior } : p
            )
          );
          this.messages.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.mensaje ?? 'No se pudo guardar la cuenta de destino.',
          });
        },
      });
  }

  /**
   * Motivo por el que no se puede traspasar el sobrante de una card.
   * Cadena vacía cuando el traspaso está disponible.
   */
  motivoBloqueo(item: PresupuestoCalculado): string {
    if (!this.periodo()) {
      return 'Elige un mes concreto para poder traspasar.';
    }
    if (!this.transferible()) {
      return `Disponible a partir del ${this.formatearFecha(this.fechaTransferencia())}.`;
    }
    if (!this.cuentasAhorro().length) {
      return 'No tienes cuentas de ahorro: créalas en «Mis bancos».';
    }
    if (item.importePendiente <= 0) {
      return 'No hay sobrante pendiente en este presupuesto.';
    }
    return '';
  }

  /** ¿Se puede traspasar el sobrante de esta card ahora mismo? */
  puedeTraspasar(item: PresupuestoCalculado): boolean {
    return !this.motivoBloqueo(item);
  }

  /** ¿Hay alguna card con sobrante disponible para traspasar? */
  puedeTraspasarTodo(): boolean {
    return this.resumen().some((item) => !this.motivoBloqueo(item));
  }

  /** Abre el diálogo para traspaso el sobrante de una card. */
  abrirTraspaso(presupuesto: Presupuesto): void {
    const item = this.resumen().find((p) => p.presupuesto.clave === presupuesto.clave);
    if (!item) {
      return;
    }

    const motivo = this.motivoBloqueo(item);
    if (motivo) {
      this.aviso('No se puede traspasar', motivo);
      return;
    }

    this.filasTraspaso.set([this.crearFila(item)]);
    this.showTraspaso = true;
  }

  /** Abre el diálogo con todas las cards que tienen sobrante disponible. */
  abrirTraspasoTodo(): void {
    const items = this.resumen().filter((item) => item.importePendiente > 0);
    if (!items.length) {
      this.aviso('No se puede traspasar', 'No hay sobrante disponible para traspasar.');
      return;
    }

    const bloqueo = items.map((item) => this.motivoBloqueo(item)).find((motivo) => !!motivo);
    if (bloqueo) {
      this.aviso('No se puede traspasar', bloqueo);
      return;
    }

    this.filasTraspaso.set(items.map((item) => this.crearFila(item)));
    this.showTraspaso = true;
  }

  /** Crea la fila editable de un presupuesto. */
  private crearFila(item: PresupuestoCalculado): FilaTraspaso {
    const disponible = this.redondear(item.importePendiente);
    return {
      presupuesto: item.presupuesto,
      cuenta: item.presupuesto.cuentaTransferencia,
      importe: disponible,
      disponible,
    };
  }

  /** Cierra el diálogo de traspaso. */
  cerrarTraspaso(): void {
    this.showTraspaso = false;
    this.filasTraspaso.set([]);
  }

  /** Rellena todos los importes con el pendiente completo de cada card. */
  rellenarConPendiente(): void {
    this.filasTraspaso.update((filas) =>
      filas.map((fila) => ({ ...fila, importe: fila.disponible }))
    );
  }

  /** Cambia el importe a traspasar de una fila del diálogo. */
  actualizarImporte(clave: string, importe: number | null): void {
    this.filasTraspaso.update((filas) =>
      filas.map((fila) => (fila.presupuesto.clave === clave ? { ...fila, importe } : fila))
    );
  }

  /** Cambia la cuenta de ahorro destino de una fila del diálogo. */
  actualizarCuenta(clave: string, cuenta: string): void {
    this.filasTraspaso.update((filas) =>
      filas.map((fila) => (fila.presupuesto.clave === clave ? { ...fila, cuenta } : fila))
    );
  }

  /** Multiplicador de la cuenta indicada (1 si no hay cuenta). */
  multiplicadorDe(cuentaId: string): number {
    return this.bancosService.porId(cuentaId)?.multiplicador || 1;
  }

  /** ¿La cuenta indicada existe y admite traspasos? */
  private cuentaValida(cuentaId: string): boolean {
    return this.cuentasAhorro().some((cuenta) => cuenta.id === cuentaId);
  }

  /** Total a traspasar (suma de los importes introducidos). */
  totalTraspaso(): number {
    return this.redondear(
      this.filasTraspaso().reduce((suma, fila) => suma + (Number(fila.importe) || 0), 0)
    );
  }

  /** Incremento del saldo de las cuentas destino (aplica los multiplicadores). */
  saldoTraspaso(): number {
    return this.redondear(
      this.filasTraspaso().reduce(
        (suma, fila) => suma + (Number(fila.importe) || 0) * this.multiplicadorDe(fila.cuenta),
        0
      )
    );
  }

  /** ¿Son válidas todas las filas del traspaso? */
  traspasoValido(): boolean {
    const filas = this.filasTraspaso();
    if (!filas.length) {
      return false;
    }
    return filas.every((fila) => {
      const importe = Number(fila.importe) || 0;
      return this.cuentaValida(fila.cuenta) && importe > 0 && importe <= fila.disponible + 0.005;
    });
  }

  /** Confirma el traspaso: guarda las cuentas elegidas y registra los movimientos. */
  confirmarTraspaso(): void {
    if (!this.traspasoValido()) {
      this.aviso(
        'Revisa el traspaso',
        'Cada presupuesto necesita una cuenta de ahorro y un importe mayor que 0 y menor o igual al disponible.'
      );
      return;
    }

    const filas = this.filasTraspaso();
    const traspasos: TraspasoPrevisto[] = [];

    for (const fila of filas) {
      const cuenta = this.bancosService.porId(fila.cuenta);
      if (!cuenta) {
        continue;
      }
      traspasos.push({
        presupuesto: fila.presupuesto,
        importe: this.redondear(Number(fila.importe) || 0),
        cuenta,
      });
      // La cuenta elegida en el diálogo pasa a ser la cuenta por defecto de la card.
      if (fila.cuenta !== fila.presupuesto.cuentaTransferencia) {
        this.seleccionarCuenta(fila.presupuesto, fila.cuenta);
      }
    }

    // El diálogo se cierra al confirmar el registro (ver ejecutarTraspaso).
    this.ejecutarTraspaso(traspasos);
  }

  /** Registra los movimientos de traspaso (uno por presupuesto). */
  private ejecutarTraspaso(traspasos: TraspasoPrevisto[]): void {
    const fecha = this.fechaTransferencia();
    if (!fecha || !traspasos.length) {
      this.aviso('No se puede traspasar', 'No hay un mes concreto seleccionado.');
      return;
    }

    this.transferiendo.set(true);

    const peticiones = traspasos.map((traspaso) => {
      const payload: CrearMovimiento = {
        fecha,
        descripcion: `Traspaso de presupuesto «${traspaso.presupuesto.nombre}»`,
        // El dinero entra en la cuenta de ahorro como gasto con categoría 'Ahorro'.
        categoria: 'Ahorro',
        tipoAhorro: traspaso.cuenta.id,
        ingreso: 0,
        gasto: traspaso.importe,
        tipo: 'gasto',
        esFijo: false,
        // Marca el origen para descontarlo del pendiente de este presupuesto.
        presupuestoClave: traspaso.presupuesto.clave,
      };
      return this.movimientosService.crearMovimiento(payload);
    });

    forkJoin(peticiones).subscribe({
      next: () => {
        this.transferiendo.set(false);
        this.cerrarTraspaso();
        this.store.cargar(true).subscribe();
        this.messages.add({
          severity: 'success',
          summary: 'Traspaso realizado',
          detail: this.resumenTraspaso(traspasos),
        });
      },
      error: (err) => {
        this.transferiendo.set(false);
        // El diálogo sigue abierto para que se pueda reintentar.
        // Puede que se hayan guardado algunos: se recarga para no mostrar datos falsos.
        this.store.cargar(true).subscribe();
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.mensaje ?? 'No se pudo registrar el traspaso.',
        });
      },
    });
  }

  /** Resumen legible de lo traspasado (para el aviso de éxito). */
  private resumenTraspaso(traspasos: TraspasoPrevisto[]): string {
    const total = this.redondear(traspasos.reduce((suma, t) => suma + t.importe, 0));
    const detalle = traspasos
      .map((traspaso) => `${traspaso.presupuesto.nombre} → ${traspaso.cuenta.nombre}`)
      .join(', ');
    return `${total.toFixed(2)} € traspasados (${detalle}).`;
  }

  /** Muestra un aviso al usuario. */
  private aviso(summary: string, detail: string): void {
    this.messages.add({ severity: 'warn', summary, detail });
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

  /** Número de días del mes (el mes va de 1 a 12). */
  private diasDelMes(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  /** Añide los ceros a la izquierda de un número de dos dígitos. */
  private pad2(valor: number): string {
    return String(valor).padStart(2, '0');
  }

  /** Redondea un importe a dos decimales. */
  private redondear(importe: number): number {
    return Math.round((importe + Number.EPSILON) * 100) / 100;
  }

  /** Formatea una fecha `aaaa-mm-dd` como `dd/mm/aaaa`. */
  private formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return '';
    }
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }
}
