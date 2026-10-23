import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { BancosService, CuentaBanco, TipoCuentaBanco } from '../../../services/bancos';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { mesLabel, MovimientosStore } from '../../../services/movimientos-store';
import {
  AmortizacionPrestamoService,
  calcularEstadoPrestamo,
} from '../../../services/amortizacion-prestamo';
import { Movimiento } from '../../../services/movimientos';
import { finalize } from 'rxjs';

/** Cuenta con los importes ya calculados para el periodo. */
interface CuentaCalculada {
  cuenta: CuentaBanco;
  /** Saldo actual de una cuenta de ahorro. */
  saldoActual: number;
  /** Variación del mes seleccionado. */
  variacionMes: number;
  /** Importe utilizado de un préstamo. */
  prestado: number;
  /** Importe disponible de un préstamo. */
  disponible: number;
  /** % del préstamo utilizado. */
  porcentajePrestamo: number;
  /** Total del préstamo (capital inicial del cuadro de amortización). */
  totalPrestamo?: number;
  /** Parte de la cuota del mes que amortiza capital. */
  cuotaCapital?: number;
  /** Parte de la cuota del mes que son intereses. */
  cuotaInteres?: number;
  /** Cuotas ya pagadas del cuadro. */
  cuotasPagadas?: number;
  /** Número total de cuotas del cuadro. */
  totalCuotas?: number;
}

/** Colores disponibles para las cuentas. */
const COLORES_CUENTA: { label: string; value: string }[] = [
  { label: 'Naranja', value: '#F97316' },
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Verde', value: '#22C55E' },
  { label: 'Turquesa', value: '#14B8A6' },
  { label: 'Morado', value: '#8B5CF6' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Rojo', value: '#EF4444' },
  { label: 'Amarillo', value: '#EAB308' },
  { label: 'Gris', value: '#6B7280' },
  { label: 'Negro', value: '#111827' },
];

/** Iconos disponibles para las cuentas. */
const ICONOS_CUENTA: { label: string; value: string }[] = [
  { label: 'Cartera', value: 'pi pi-wallet' },
  { label: 'Banco', value: 'pi pi-building-columns' },
  { label: 'Hucha', value: 'pi pi-piggy-bank' },
  { label: 'Tarjeta', value: 'pi pi-credit-card' },
  { label: 'Dinero', value: 'pi pi-money-bill' },
  { label: 'Euro', value: 'pi pi-euro' },
  { label: 'Edificio', value: 'pi pi-building' },
  { label: 'Maletín', value: 'pi pi-briefcase' },
  { label: 'Gráfica', value: 'pi pi-chart-line' },
  { label: 'Mundo', value: 'pi pi-globe' },
];

const TIPOS_CUENTA: { label: string; value: TipoCuentaBanco }[] = [
  { label: 'Cuenta de ahorro', value: 'ahorro' },
  { label: 'Préstamo', value: 'prestamo' },
];

type FormCuenta = {
  nombre: string;
  tipo: TipoCuentaBanco;
  saldoOrigen: number;
  color: string;
  icono: string;
};

@Component({
  selector: 'app-cuentas',
  imports: [
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.scss',
})
export class Cuentas implements OnInit {
  private readonly store = inject(MovimientosStore);
  private readonly bancos = inject(BancosService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly amortizacion = inject(AmortizacionPrestamoService);

  readonly cargando = computed(() => this.store.cargando() || this.bancos.cargando());
  readonly error = this.store.error;
  /** Error específico al cargar las cuentas (se muestra como aviso). */
  readonly errorCuentas = this.bancos.error;

  /** Movimientos del mes seleccionado (filtro global). */
  private readonly movimientosMes = this.store.movimientosFiltrados;
  /** Todos los movimientos (histórico). */
  private readonly movimientosTodos = this.store.movimientos;

  /** Cuentas configuradas. */
  readonly cuentas = this.bancos.cuentas;

  /** Id de la cuenta cuyo detalle está desplegado. */
  readonly seleccionada = signal<string | null>(null);

  readonly periodoLabel = computed(() => mesLabel(this.store.mesSeleccionado()));

  /** Suma bruta (todos los meses) de gastos de Ahorro por cuenta. */
  private readonly sumas = computed<Record<string, number>>(() => {
    const sumas: Record<string, number> = {};
    for (const movimiento of this.movimientosTodos()) {
      if (this.esAhorro(movimiento) && movimiento.tipoAhorro) {
        sumas[movimiento.tipoAhorro] =
          (sumas[movimiento.tipoAhorro] ?? 0) + (movimiento.gasto || 0);
      }
    }
    return sumas;
  });

  /** Suma bruta del mes seleccionado de gastos de Ahorro por cuenta. */
  private readonly sumasMes = computed<Record<string, number>>(() => {
    const sumas: Record<string, number> = {};
    for (const movimiento of this.movimientosMes()) {
      if (this.esAhorro(movimiento) && movimiento.tipoAhorro) {
        sumas[movimiento.tipoAhorro] =
          (sumas[movimiento.tipoAhorro] ?? 0) + (movimiento.gasto || 0);
      }
    }
    return sumas;
  });

  /** Cálculo reactivo de saldos, variación del mes y datos de préstamos. */
  readonly cuentasCalculadas = computed<CuentaCalculada[]>(() => {
    const sumas = this.sumas();
    const sumasMes = this.sumasMes();

    // Datos del cuadro de amortización del préstamo (tabla `amortizacion_prestamo`).
    const cuotas = this.amortizacion.cuotas();
    const datos = this.amortizacion.datos();
    const movimientos = this.movimientosTodos();

    return this.cuentas().map((cuenta) => {
      const factor = cuenta.multiplicador || 1;
      const prestado = sumas[cuenta.id] ?? 0;

      if (cuenta.tipo === 'prestamo') {
        // En el préstamo solo descuenta el capital amortizado de las cuotas
        // (no los intereses) y los traspasos que se hacen a la cuenta.
        const resumen = calcularEstadoPrestamo(cuotas, datos, movimientos, cuenta.id).resumen;

        if (resumen) {
          return {
            cuenta,
            // Lo que queda por devolver del préstamo.
            saldoActual: resumen.capitalPendiente,
            variacionMes: resumen.cuotaActual?.cuota ?? 0,
            prestado: resumen.amortizado,
            disponible: resumen.capitalPendiente,
            porcentajePrestamo: resumen.porcentaje,
            totalPrestamo: resumen.capitalInicial,
            cuotaCapital: resumen.cuotaActual?.amortizacionCapital ?? 0,
            cuotaInteres: resumen.cuotaActual?.interesPagado ?? 0,
            cuotasPagadas: resumen.cuotasPagadas,
            totalCuotas: resumen.totalCuotas,
          };
        }

        // Sin cuadro de amortización importado: se usa el total de la cuenta.
        return {
          cuenta,
          saldoActual: cuenta.saldoOrigen - prestado,
          variacionMes: factor * (sumasMes[cuenta.id] ?? 0),
          prestado,
          disponible: cuenta.saldoOrigen - prestado,
          porcentajePrestamo:
            cuenta.saldoOrigen > 0 ? Math.min(100, (prestado / cuenta.saldoOrigen) * 100) : 0,
          totalPrestamo: cuenta.saldoOrigen,
        };
      }

      return {
        cuenta,
        saldoActual: cuenta.saldoOrigen + factor * prestado,
        variacionMes: factor * (sumasMes[cuenta.id] ?? 0),
        prestado,
        disponible: cuenta.saldoOrigen - prestado,
        porcentajePrestamo:
          cuenta.saldoOrigen > 0 ? Math.min(100, (prestado / cuenta.saldoOrigen) * 100) : 0,
      };
    });
  });

  /** Cuenta seleccionada para mostrar el detalle. */
  readonly cuentaSeleccionada = computed(
    () => this.cuentas().find((cuenta) => cuenta.id === this.seleccionada()) ?? null,
  );

  /** Movimientos del mes seleccionado de la cuenta clicada. */
  readonly detalle = computed<Movimiento[]>(() => {
    const id = this.seleccionada();
    if (!id) {
      return [];
    }
    return this.movimientosMes().filter(
      (movimiento) => this.esAhorro(movimiento) && movimiento.tipoAhorro === id,
    );
  });

  readonly detalleTitulo = computed(() => this.cuentaSeleccionada()?.nombre ?? '');

  // --- Alta / edición de cuentas ---

  readonly tipoCuentaOptions = TIPOS_CUENTA;
  readonly coloresCuenta = COLORES_CUENTA;
  readonly iconosCuenta = ICONOS_CUENTA;

  readonly showCuentaDialog = signal(false);
  readonly cuentaEditando = signal<CuentaBanco | null>(null);
  readonly guardandoCuenta = signal(false);

  submittedCuenta = false;
  formCuenta: FormCuenta = this.emptyCuenta();

  ngOnInit(): void {
    this.store.cargar().subscribe();
    this.bancos.cargar().subscribe();
    this.amortizacion.cargar().subscribe();
  }

  /** La categoría de ahorro se guarda como 'Ahorro' (se compara sin distinguir mayúsculas). */
  private esAhorro(movimiento: Movimiento): boolean {
    return (movimiento.categoria || '').trim().toLowerCase() === 'ahorro';
  }

  seleccionar(id: string): void {
    this.seleccionada.update((actual) => (actual === id ? null : id));
  }

  cerrarDetalle(): void {
    this.seleccionada.set(null);
  }

  /** Reintenta la carga de cuentas desde la BBDD. */
  recargarCuentas(): void {
    this.bancos.cargar(true).subscribe();
  }

  abrirNuevaCuenta(): void {
    this.cuentaEditando.set(null);
    this.formCuenta = this.emptyCuenta();
    this.submittedCuenta = false;
    this.showCuentaDialog.set(true);
  }

  editarCuenta(cuenta: CuentaBanco): void {
    this.cuentaEditando.set(cuenta);
    this.formCuenta = {
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      saldoOrigen: cuenta.saldoOrigen,
      color: cuenta.color,
      icono: cuenta.icono,
    };
    this.submittedCuenta = false;
    this.showCuentaDialog.set(true);
  }

  guardarCuenta(): void {
    this.submittedCuenta = true;

    if (!this.formCuenta.nombre.trim()) {
      return;
    }

    const datos = {
      nombre: this.formCuenta.nombre.trim(),
      tipo: this.formCuenta.tipo,
      saldoOrigen: Math.max(0, Number(this.formCuenta.saldoOrigen) || 0),
      color: this.formCuenta.color || '#4169e1',
      icono: this.formCuenta.icono || 'pi pi-wallet',
    };

    const editando = this.cuentaEditando();
    const peticion$ = editando
      ? this.bancos.actualizar(editando._id, datos)
      : this.bancos.agregar(datos);

    this.guardandoCuenta.set(true);

    peticion$.pipe(finalize(() => this.guardandoCuenta.set(false))).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: editando ? 'Actualizada' : 'Añadida',
          detail: editando
            ? 'La cuenta se ha actualizado correctamente.'
            : 'La cuenta se ha añadido correctamente.',
        });
        this.cerrarCuentaDialog();
      },
      error: (err) => {
        console.error('Error al guardar la cuenta:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: this.mensajeError(err, 'No se pudo guardar la cuenta.'),
        });
      },
    });
  }

  eliminarCuenta(cuenta: CuentaBanco): void {
    if (cuenta.fija) {
      return;
    }

    this.confirm.confirm({
      key: 'bancos',
      header: 'Eliminar cuenta',
      message: `¿Seguro que quieres eliminar «${cuenta.nombre}»? Sus movimientos de ahorro seguirán existiendo, pero dejarán de mostrarse en esta cuenta.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.bancos.eliminar(cuenta._id).subscribe({
          next: () => {
            if (this.seleccionada() === cuenta.id) {
              this.seleccionada.set(null);
            }
            this.messages.add({
              severity: 'success',
              summary: 'Eliminada',
              detail: 'La cuenta se ha eliminado correctamente.',
            });
          },
          error: (err) => {
            console.error('Error al eliminar la cuenta:', err);
            this.messages.add({
              severity: 'error',
              summary: 'Error',
              detail: this.mensajeError(err, 'No se pudo eliminar la cuenta.'),
            });
          },
        });
      },
    });
  }

  cerrarCuentaDialog(): void {
    this.showCuentaDialog.set(false);
    this.cuentaEditando.set(null);
    this.submittedCuenta = false;
  }

  onCuentaDialogVisibility(visible: boolean): void {
    if (visible) {
      this.showCuentaDialog.set(true);
    } else {
      this.cerrarCuentaDialog();
    }
  }

  private mensajeError(error: unknown, porDefecto: string): string {
    const mensaje = (error as { error?: { mensaje?: string } })?.error?.mensaje;
    return mensaje || porDefecto;
  }

  private emptyCuenta(): FormCuenta {
    return {
      nombre: '',
      tipo: 'ahorro',
      saldoOrigen: 0,
      color: '#3B82F6',
      icono: 'pi pi-wallet',
    };
  }
}
