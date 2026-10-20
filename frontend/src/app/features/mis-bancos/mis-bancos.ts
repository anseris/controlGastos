import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { Movimiento } from '../../services/movimientos';
import { MovimientosStore, mesLabel } from '../../services/movimientos-store';

/** Valores admitidos por el enum `tipoAhorro` del backend. */
const TIPOS_AHORRO = ['ing', 'revolut', 'prestamo'] as const;
type TipoAhorro = (typeof TIPOS_AHORRO)[number];

/** Saldo inicial (antes de los movimientos registrados) de cada cuenta. */
const SALDO_ORIGEN_ING = 2525.81;
const SALDO_ORIGEN_REVOLUT = 165.45;
/** Cada ahorro 'revolut' suma el doble en la card. */
const MULTIPLICADOR_REVOLUT = 2;

const TOTAL_PRESTAMO_DEFECTO = 1705.73;
const STORAGE_KEY_PRESTAMO = 'mis-bancos:prestamo-total-v2';

const esTipoAhorro = (valor: string): valor is TipoAhorro =>
  (TIPOS_AHORRO as readonly string[]).includes(valor);

@Component({
  selector: 'app-mis-bancos',
  imports: [
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './mis-bancos.html',
  styleUrl: './mis-bancos.scss',
})
export class MisBancos implements OnInit {
  private readonly store = inject(MovimientosStore);

  readonly cargando = this.store.cargando;
  readonly error = this.store.error;

  /** Movimientos del mes seleccionado (filtro global). */
  private readonly movimientosMes = this.store.movimientosFiltrados;
  /** Todos los movimientos (histórico). */
  private readonly movimientosTodos = this.store.movimientos;

  readonly seleccionada = signal<TipoAhorro | null>(null);
  readonly periodoLabel = computed(() => mesLabel(this.store.mesSeleccionado()));

  /** Saldos de origen mostrados como referencia en las cards. */
  readonly saldoOrigenIng = SALDO_ORIGEN_ING;
  readonly saldoOrigenRevolut = SALDO_ORIGEN_REVOLUT;
  readonly multiplicadorRevolut = MULTIPLICADOR_REVOLUT;

  /** Suma bruta (todos los meses) de gastos de Ahorro por banco. */
  private readonly sumas = computed<Record<TipoAhorro, number>>(() => {
    const sumas: Record<TipoAhorro, number> = { ing: 0, revolut: 0, prestamo: 0 };
    for (const movimiento of this.movimientosTodos()) {
      if (this.esAhorro(movimiento) && esTipoAhorro(movimiento.tipoAhorro)) {
        sumas[movimiento.tipoAhorro] += movimiento.gasto || 0;
      }
    }
    return sumas;
  });

  /** Suma bruta del mes seleccionado de gastos de Ahorro por banco. */
  private readonly sumasMes = computed<Record<TipoAhorro, number>>(() => {
    const sumas: Record<TipoAhorro, number> = { ing: 0, revolut: 0, prestamo: 0 };
    for (const movimiento of this.movimientosMes()) {
      if (this.esAhorro(movimiento) && esTipoAhorro(movimiento.tipoAhorro)) {
        sumas[movimiento.tipoAhorro] += movimiento.gasto || 0;
      }
    }
    return sumas;
  });

  /**
   * Saldo actual de ING y Revolut:
   * saldo de origen + movimientos acumulados (Revolut cuenta el doble).
   */
  readonly saldos = computed(() => ({
    ing: SALDO_ORIGEN_ING + this.sumas().ing,
    revolut: SALDO_ORIGEN_REVOLUT + MULTIPLICADOR_REVOLUT * this.sumas().revolut,
  }));

  /** Variación del mes seleccionado (Revolut cuenta el doble). */
  readonly saldosMes = computed(() => ({
    ing: this.sumasMes().ing,
    revolut: MULTIPLICADOR_REVOLUT * this.sumasMes().revolut,
  }));

  /** Total estipulado del préstamo (editable, se guarda en localStorage). */
  readonly prestamoTotal = signal(TOTAL_PRESTAMO_DEFECTO);
  /** Total ya amortizado del préstamo (todos los meses). */
  readonly prestamoPrestado = computed(() => this.sumas().prestamo);
  /** Lo que queda por devolver del préstamo. */
  readonly prestamoDisponible = computed(
    () => this.prestamoTotal() - this.prestamoPrestado()
  );

  /** Movimientos del mes seleccionado de la card clicada. */
  readonly detalle = computed<Movimiento[]>(() => {
    const tipo = this.seleccionada();
    if (!tipo) {
      return [];
    }
    return this.movimientosMes().filter(
      (m) => this.esAhorro(m) && m.tipoAhorro === tipo
    );
  });

  readonly detalleTitulo = computed(() => {
    switch (this.seleccionada()) {
      case 'ing':
        return 'ING Ahorro';
      case 'revolut':
        return 'Revolut';
      case 'prestamo':
        return 'Préstamo';
      default:
        return '';
    }
  });

  // --- Edición del total del préstamo ---
  showEditPrestamo = false;
  editPrestamoTotal = TOTAL_PRESTAMO_DEFECTO;

  ngOnInit(): void {
    this.store.cargar().subscribe();
    this.cargarPrestamoTotal();
  }

  /** La categoría de ahorro se guarda como 'Ahorro' (se compara sin distinguir mayúsculas). */
  private esAhorro(movimiento: Movimiento): boolean {
    return (movimiento.categoria || '').trim().toLowerCase() === 'ahorro';
  }

  seleccionar(tipo: TipoAhorro): void {
    this.seleccionada.update((actual) => (actual === tipo ? null : tipo));
  }

  cerrarDetalle(): void {
    this.seleccionada.set(null);
  }

  abrirEdicionPrestamo(): void {
    this.editPrestamoTotal = this.prestamoTotal();
    this.showEditPrestamo = true;
  }

  cerrarEdicionPrestamo(): void {
    this.showEditPrestamo = false;
  }

  guardarPrestamoTotal(): void {
    const valor = Math.max(0, Number(this.editPrestamoTotal) || 0);
    this.prestamoTotal.set(valor);

    try {
      localStorage.setItem(STORAGE_KEY_PRESTAMO, String(valor));
    } catch {
      // Si localStorage no está disponible el valor queda solo en memoria.
    }

    this.showEditPrestamo = false;
  }

  private cargarPrestamoTotal(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRESTAMO);
      const valor = raw ? Number(raw) : NaN;
      if (Number.isFinite(valor) && valor >= 0) {
        this.prestamoTotal.set(valor);
      }
    } catch {
      // Sin localStorage se mantiene el valor por defecto (1705,73).
    }
  }

  /** % del total del préstamo ya utilizado (para la barra). */
  porcentajePrestamo(): number {
    const total = this.prestamoTotal();
    if (total <= 0) {
      return 0;
    }
    return Math.min(100, (this.prestamoPrestado() / total) * 100);
  }
}
