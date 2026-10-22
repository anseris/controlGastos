import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, map, of, tap, type Observable } from 'rxjs';
import {
  AmortizacionCuota,
  PrestamoCuadro,
  calcularEstadoPrestamo,
} from './amortizacion-prestamo-calculo';

export type {
  AmortizacionCuota,
  PrestamoCuadro,
  EstadoCuota,
  ResumenPrestamo,
  MovimientoPago,
} from './amortizacion-prestamo-calculo';

export { calcularEstadoPrestamo } from './amortizacion-prestamo-calculo';

/** Base de la API del backend (Express en el puerto 3000). */
const url = window.location.href;
const API_BASE = url.includes('localhost') ? 'http://localhost:3000/api' : 'https://controlgastos-8fb2.onrender.com/api';
// const API_BASE = 'http://localhost:3000/api';
// const API_BASE = 'https://controlgastos-8fb2.onrender.com/api';

/**
 * Llamadas al backend del cuadro de amortización del préstamo
 * (`/api/amortizacion-prestamo`).
 */
@Injectable({
  providedIn: 'root',
})
export class AmortizacionPrestamoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE}/amortizacion-prestamo`;

  /** Cuotas del cuadro de amortización. */
  readonly cuotas = signal<AmortizacionCuota[]>([]);
  /** Cabecera del cuadro (datos del préstamo). */
  readonly datos = signal<PrestamoCuadro | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  private readonly cargado = signal(false);

  /** GET /api/amortizacion-prestamo -> carga el cuadro desde la BBDD. */
  cargar(force = false): Observable<AmortizacionCuota[]> {
    if (!force && (this.cargando() || this.cargado())) {
      return of(this.cuotas());
    }

    this.cargando.set(true);
    this.error.set('');

    return this.http
      .get<{ datos: PrestamoCuadro | null; cuotas: AmortizacionCuota[] }>(this.apiUrl)
      .pipe(
        tap({
          next: (respuesta) => {
            this.cuotas.set(respuesta.cuotas ?? []);
            this.datos.set(respuesta.datos ?? null);
            this.cargado.set(true);
          },
          error: (err) => {
            console.error('Error al cargar el cuadro de amortización:', err);
            this.error.set('No se ha podido cargar el cuadro de amortización.');
            this.cuotas.set([]);
            this.datos.set(null);
          },
        }),
        finalize(() => this.cargando.set(false)),
        map(() => this.cuotas())
      );
  }

  /**
   * POST /api/amortizacion-prestamo/importar
   *
   * - Sin `contenidoBase64` el backend usa el `CuadroDeAmortizacion.XLS` del
   *   proyecto.
   * - Con `contenidoBase64` se usa el archivo que sube el navegador.
   */
  importar(contenidoBase64?: string): Observable<{ mensaje: string }> {
    return this.http
      .post<{ mensaje: string }>(`${this.apiUrl}/importar`, { contenidoBase64 })
      .pipe(
        tap({
          next: () => {
            this.cargado.set(false);
            this.cargar(true).subscribe();
          },
        })
      );
  }

  /** POST /api/amortizacion-prestamo/sincronizar -> actualiza el gasto fijo. */
  sincronizar(): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/sincronizar`, {}).pipe(
      tap(() => {
        this.cargado.set(false);
        this.cargar(true).subscribe();
      })
    );
  }
}
