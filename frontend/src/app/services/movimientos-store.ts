import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize, of, tap, type Observable } from 'rxjs';
import { Movimiento, MovimientosService } from './movimientos';

/** Opción del selector de periodo (mes). */
export interface MesOption {
  label: string;
  value: string;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/** Etiqueta legible de un mes en formato `aaaa-mm` (o 'all'). */
export function mesLabel(value: string): string {
  if (!value || value === 'all') return 'Todos los meses';
  const [year, month] = value.split('-').map(Number);
  return `${MESES[(month ?? 1) - 1]} ${year}`;
}

/** Mes actual en formato `aaaa-mm` (según la fecha local del navegador). */
export function mesActual(): string {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Estado compartido del periodo seleccionado.
 *
 * Cualquier componente puede inyectarlo y leer `movimientosFiltrados()` para
 * obtener los movimientos del mes elegido en el selector de `period-month`.
 *
 * ```ts
 * private readonly store = inject(MovimientosStore);
 * readonly movimientos = this.store.movimientosFiltrados;
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MovimientosStore {
  private readonly movimientosService = inject(MovimientosService);

  /** Todos los movimientos recuperados de la BBDD. */
  readonly movimientos = signal<Movimiento[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  /** Indica si ya se ha completado al menos una carga. */
  private readonly cargado = signal(false);

  /** Mes seleccionado en formato `aaaa-mm`, o 'all' para todos. */
  readonly mesSeleccionado = signal(mesActual());

  /** Meses disponibles (formato `aaaa-mm`), de más reciente a más antiguo. */
  readonly mesesDisponibles = computed<string[]>(() => {
    const meses = new Set(this.movimientos().map((m) => m.fecha.slice(0, 7)));
    // Incluye el mes actual aunque todavía no tenga movimientos.
    meses.add(mesActual());
    return [...meses].sort().reverse();
  });

  /** Opciones listas para el `<p-select>` de periodo. */
  readonly mesOptions = computed<MesOption[]>(() => [
    { label: 'Todos los meses', value: 'all' },
    ...this.mesesDisponibles().map((mes) => ({ label: mesLabel(mes), value: mes })),
  ]);

  /** Movimientos del mes seleccionado (todos si se elige 'all'). */
  readonly movimientosFiltrados = computed<Movimiento[]>(() => {
    const mes = this.mesSeleccionado();
    if (!mes || mes === 'all') {
      return this.movimientos();
    }
    return this.movimientos().filter((m) => m.fecha.slice(0, 7) === mes);
  });

  /**
   * Recarga los movimientos desde el backend y actualiza los meses disponibles.
   * Evita peticiones duplicadas: si ya está cargando o ya se cargó, no repite
   * la llamada salvo que se pase `force = true` (p. ej. tras guardar o borrar).
   */
  cargar(force = false): Observable<Movimiento[]> {
    if (!force && (this.cargando() || this.cargado())) {
      return of(this.movimientos());
    }

    this.cargando.set(true);
    this.error.set('');

    return this.movimientosService.obtenerMovimientos().pipe(
      tap({
        next: (datos) => {
          this.movimientos.set(datos);
          this.cargado.set(true);
          // La primera vez selecciona el mes más reciente.
          if (!this.mesSeleccionado()) {
            this.mesSeleccionado.set(this.mesesDisponibles()[0] ?? 'all');
          }
        },
        error: (err) => {
          console.error('Error al cargar movimientos:', err);
          this.error.set('No se han podido cargar los movimientos.');
          this.movimientos.set([]);
        },
      }),
      finalize(() => this.cargando.set(false))
    );
  }

  /** Cambia el mes seleccionado. */
  seleccionarMes(mes: string): void {
    this.mesSeleccionado.set(mes);
  }
}
