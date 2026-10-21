import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Base de la API del backend (Express en el puerto 3000). */
// const API_BASE = 'http://localhost:3000/api';
const API_BASE = 'https://controlgastos-8fb2.onrender.com/api';

/** Presupuesto tal y como lo devuelve el backend (colección `presupuestos`). */
export interface Presupuesto {
  _id: string;
  /** Identificador fijo: 'casa' | 'ahorro' | 'para-mi'. */
  clave: string;
  nombre: string;
  /** Porcentaje de los ingresos del mes asignado a este presupuesto. */
  porcentaje: number;
  /** Nombres de categorías cuyos gastos descuentan de este presupuesto. */
  categorias: string[];
  /** Día del mes (1-31) a partir del cual se puede traspasar el sobrante. */
  diaTransferencia: number;
  /** Clave de la cuenta de ahorro (`cuentas-banco.clave`) destino del traspaso. */
  cuentaTransferencia: string;
  orden: number;
}

/** Cuerpo para modificar un presupuesto (PUT /api/presupuestos/:clave). */
export interface ActualizarPresupuesto {
  porcentaje?: number;
  categorias?: string[];
  diaTransferencia?: number;
  cuentaTransferencia?: string;
}

/** Respuesta genérica de mensajes del backend. */
export interface ApiMensaje {
  mensaje: string;
}

/** Llamadas al backend de presupuestos (`/api/presupuestos`). */
@Injectable({
  providedIn: 'root',
})
export class PresupuestosService {
  private readonly apiUrl = `${API_BASE}/presupuestos`;

  constructor(private http: HttpClient) {}

  /** GET /api/presupuestos — lista (y crea si faltan) los tres presupuestos. */
  obtenerPresupuestos(): Observable<Presupuesto[]> {
    return this.http.get<Presupuesto[]>(this.apiUrl);
  }

  /** PUT /api/presupuestos/:clave — actualiza porcentaje y/o categorías. */
  actualizarPresupuesto(
    clave: string,
    cambios: ActualizarPresupuesto
  ): Observable<Presupuesto> {
    return this.http.put<Presupuesto>(`${this.apiUrl}/${clave}`, cambios);
  }

  /**
   * PUT /api/presupuestos/dia-transferencia
   * Cambia el día del mes a partir del cual se puede traspasar el sobrante
   * en todos los presupuestos a la vez.
   */
  actualizarDiaTransferencia(dia: number): Observable<Presupuesto[]> {
    return this.http.put<Presupuesto[]>(`${this.apiUrl}/dia-transferencia`, { dia });
  }
}
