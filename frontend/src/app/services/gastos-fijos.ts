import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, map, of, tap, type Observable } from 'rxjs';

/** Base de la API del backend (Express en el puerto 3000). */
const url = window.location.href;
const API_BASE = url.includes('localhost') ? 'http://localhost:3000/api' : 'https://controlgastos-8fb2.onrender.com/api';
// const API_BASE = 'http://localhost:3000/api';
// const API_BASE = 'https://controlgastos-8fb2.onrender.com/api';

/**
 * Documento de gasto fijo tal y como lo guarda el backend
 * (colección `gastos_fijos` de MongoDB).
 */
export interface GastoFijo {
  _id: string;
  /** Día del mes (1-31) en el que se genera el movimiento. */
  dia: number;
  descripcion: string;
  categoria: string;
  /** Importe del gasto (siempre es un gasto). */
  importe: number;
  /** Tipo de movimiento: siempre 'gasto'. */
  tipo: string;
  /** Si está activo, el generador crea el movimiento cada mes. */
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Datos editables de un gasto fijo (alta y modificación). */
export interface DatosGastoFijo {
  dia: number;
  descripcion: string;
  categoria: string;
  importe: number;
  tipo?: string;
  activo?: boolean;
}

/** Respuesta genérica del backend para mensajes. */
export interface ApiMensaje {
  mensaje: string;
}

/** Resultado de la generación manual de movimientos del mes. */
export interface ResultadoGeneracion {
  mensaje: string;
  generados: number;
}

/**
 * Llamadas al backend de gastos fijos (`/api/gastos-fijos`).
 * Los gastos fijos se guardan en MongoDB, no en el navegador.
 */
@Injectable({
  providedIn: 'root',
})
export class GastosFijosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE}/gastos-fijos`;

  /** Gastos fijos cargados desde la BBDD. */
  readonly gastosFijos = signal<GastoFijo[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  private readonly cargado = signal(false);

  /**
   * Carga los gastos fijos desde la BBDD.
   * Evita peticiones duplicadas salvo que se pase `force = true`.
   */
  cargar(force = false): Observable<GastoFijo[]> {
    if (!force && (this.cargando() || this.cargado())) {
      return of(this.gastosFijos());
    }

    this.cargando.set(true);
    this.error.set('');

    return this.http.get<GastoFijo[]>(this.apiUrl).pipe(
      tap({
        next: (datos) => {
          this.gastosFijos.set(datos);
          this.cargado.set(true);
        },
        error: (err) => {
          console.error('Error al cargar los gastos fijos:', err);
          this.error.set('No se han podido cargar los gastos fijos.');
        },
      }),
      finalize(() => this.cargando.set(false))
    );
  }

  /** POST /api/gastos-fijos -> crea un gasto fijo en la BBDD. */
  agregar(datos: DatosGastoFijo): Observable<GastoFijo> {
    return this.http.post<GastoFijo>(this.apiUrl, datos).pipe(
      tap((nuevo) => {
        this.gastosFijos.update((lista) =>
          [...lista, nuevo].sort((a, b) => a.dia - b.dia || a.descripcion.localeCompare(b.descripcion))
        );
      })
    );
  }

  /** PUT /api/gastos-fijos/:id -> actualiza un gasto fijo existente. */
  actualizar(gastoFijoId: string, datos: DatosGastoFijo): Observable<GastoFijo> {
    return this.http.put<GastoFijo>(`${this.apiUrl}/${gastoFijoId}`, datos).pipe(
      tap((actualizado) => {
        this.gastosFijos.update((lista) =>
          lista
            .map((item) => (item._id === actualizado._id ? actualizado : item))
            .sort((a, b) => a.dia - b.dia || a.descripcion.localeCompare(b.descripcion))
        );
      })
    );
  }

  /** DELETE /api/gastos-fijos/:id -> elimina un gasto fijo. */
  eliminar(gastoFijoId: string): Observable<ApiMensaje> {
    return this.http.delete<ApiMensaje>(`${this.apiUrl}/${gastoFijoId}`).pipe(
      tap(() => {
        this.gastosFijos.update((lista) => lista.filter((item) => item._id !== gastoFijoId));
      })
    );
  }

  /**
   * POST /api/gastos-fijos/generar -> genera los movimientos del mes actual
   * para los gastos fijos activos que todavía no los tienen.
   */
  generarMovimientos(): Observable<ResultadoGeneracion> {
    return this.http.post<ResultadoGeneracion>(`${this.apiUrl}/generar`, {}).pipe(
      map((resultado) => ({
        mensaje: resultado.mensaje ?? 'Movimientos generados.',
        generados: resultado.generados ?? 0,
      }))
    );
  }
}
