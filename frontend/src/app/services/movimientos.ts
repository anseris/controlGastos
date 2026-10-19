import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Base de la API del backend (Express en el puerto 3000). */
const API_BASE = 'http://localhost:3000/api';

/** Valores admitidos por el enum `tipo` del modelo Mongoose. */
export type TipoMovimiento = 'ingreso' | 'gasto';

/** Documento tal y como lo devuelve el backend (colección `movimientos`). */
export interface Movimiento {
  _id: string;
  id?: number;
  /** Fecha en formato string `aaaa-mm-dd`. */
  fecha: string;
  descripcion: string;
  categoria: string;
  ingreso: number;
  gasto: number;
  tipo: string;
  esFijo: boolean;
}

/**
 * Cuerpo para crear un movimiento (POST).
 * El backend exige: categoria, ingreso, gasto y tipo.
 * `fecha` (formato `aaaa-mm-dd`) tiene valor por defecto (hoy) y `esFijo` por defecto `false`.
 */
export interface CrearMovimiento {
  categoria: string;
  ingreso: number;
  gasto: number;
  tipo: TipoMovimiento | string;
  /** Fecha en formato string `aaaa-mm-dd`. */
  fecha?: string;
  descripcion?: string;
  esFijo?: boolean;
}

/** Cuerpo para modificar un movimiento (PUT): todos los campos son opcionales. */
export type ActualizarMovimiento = Partial<CrearMovimiento>;

/** Respuesta genérica del backend para mensajes (delete, errores 4xx/5xx). */
export interface ApiMensaje {
  mensaje: string;
}

/**
 * Llamadas al backend de movimientos (`/api/movimientos`).
 * Espeja los endpoints definidos en `backend/src/routes/movimientos.routes.ts`.
 */
@Injectable({
  providedIn: 'root'
})
export class MovimientosService {
  private readonly apiUrl = `${API_BASE}/movimientos`;

  constructor(private http: HttpClient) {}

  /** GET /api/movimientos — lista todos los movimientos (orden: fecha desc). */
  obtenerMovimientos(): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(this.apiUrl);
  }

  /** GET /api/movimientos/:id — obtiene un movimiento por su _id. */
  obtenerMovimientoPorId(id: string): Observable<Movimiento> {
    return this.http.get<Movimiento>(`${this.apiUrl}/${id}`);
  }

  /** POST /api/movimientos — crea un movimiento. */
  crearMovimiento(movimiento: CrearMovimiento): Observable<Movimiento> {
    return this.http.post<Movimiento>(this.apiUrl, movimiento);
  }

  /** PUT /api/movimientos/:id — modifica un movimiento existente. */
  actualizarMovimiento(id: string, movimiento: ActualizarMovimiento): Observable<Movimiento> {
    return this.http.put<Movimiento>(`${this.apiUrl}/${id}`, movimiento);
  }

  /** DELETE /api/movimientos/:id — elimina un movimiento. */
  eliminarMovimiento(id: string): Observable<ApiMensaje> {
    return this.http.delete<ApiMensaje>(`${this.apiUrl}/${id}`);
  }
}
