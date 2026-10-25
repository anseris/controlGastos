import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, map, of, tap, type Observable } from 'rxjs';
import { API_BASE } from '../core/api-base';

export type TipoCuentaBanco = 'ahorro' | 'prestamo';

/**
 * Documento de cuenta tal y como lo guarda el backend.
 * `clave` es el identificador estable que se guarda en `movimiento.tipoAhorro`.
 */
interface CuentaBancoApi {
  _id: string;
  clave: string;
  nombre: string;
  tipo: TipoCuentaBanco;
  saldoOrigen: number;
  color: string;
  icono: string;
  multiplicador: number;
  fija: boolean;
  orden: number;
}

/** Cuenta de "Mis bancos" usada por la interfaz. */
export interface CuentaBanco {
  _id: string;
  /** Clave estable guardada en `movimiento.tipoAhorro`. */
  id: string;
  nombre: string;
  tipo: TipoCuentaBanco;
  /** Saldo inicial (ahorro) o total estipulado (préstamo). */
  saldoOrigen: number;
  color: string;
  icono: string;
  multiplicador: number;
  fija: boolean;
  orden: number;
}

/** Datos editables de una cuenta. */
export interface DatosCuentaBanco {
  nombre: string;
  tipo: TipoCuentaBanco;
  saldoOrigen: number;
  color: string;
  icono: string;
}

/** Respuesta genérica del backend para mensajes. */
export interface ApiMensaje {
  mensaje: string;
}

/**
 * Llamadas al backend de cuentas de "Mis bancos" (`/api/cuentas-banco`).
 * Las cuentas se guardan en MongoDB, no en el navegador.
 */
@Injectable({
  providedIn: 'root',
})
export class BancosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE}/cuentas-banco`;

  readonly cuentas = signal<CuentaBanco[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  private readonly cargado = signal(false);

  /** Cuenta por su clave (el valor guardado en `tipoAhorro`). */
  porId(clave: string | null): CuentaBanco | undefined {
    return clave ? this.cuentas().find((cuenta) => cuenta.id === clave) : undefined;
  }

  /**
   * Carga las cuentas desde la BBDD.
   * Evita peticiones duplicadas salvo que se pase `force = true`.
   */
  cargar(force = false): Observable<CuentaBanco[]> {
    if (!force && (this.cargando() || this.cargado())) {
      return of(this.cuentas());
    }

    this.cargando.set(true);
    this.error.set('');

    return this.http.get<CuentaBancoApi[]>(this.apiUrl).pipe(
      map((datos) => datos.map((cuenta) => this.normalizar(cuenta))),
      tap({
        next: (datos) => {
          this.cuentas.set(datos);
          this.cargado.set(true);
        },
        error: (err) => {
          console.error('Error al cargar las cuentas:', err);
          this.error.set('No se han podido cargar las cuentas.');
        },
      }),
      finalize(() => this.cargando.set(false))
    );
  }

  /** POST /api/cuentas-banco — crea una cuenta en la BBDD. */
  agregar(datos: DatosCuentaBanco): Observable<CuentaBanco> {
    return this.http.post<CuentaBancoApi>(this.apiUrl, datos).pipe(
      map((cuenta) => this.normalizar(cuenta)),
      tap((nueva) => {
        this.cuentas.update((lista) => [...lista, nueva]);
      })
    );
  }

  /** PUT /api/cuentas-banco/:id — actualiza una cuenta existente. */
  actualizar(cuentaId: string, cambios: DatosCuentaBanco): Observable<CuentaBanco> {
    return this.http.put<CuentaBancoApi>(`${this.apiUrl}/${cuentaId}`, cambios).pipe(
      map((cuenta) => this.normalizar(cuenta)),
      tap((actualizada) => {
        this.cuentas.update((lista) =>
          lista.map((item) => (item._id === actualizada._id ? actualizada : item))
        );
      })
    );
  }

  /** DELETE /api/cuentas-banco/:id — elimina una cuenta propia. */
  eliminar(cuentaId: string): Observable<ApiMensaje> {
    return this.http.delete<ApiMensaje>(`${this.apiUrl}/${cuentaId}`).pipe(
      tap(() => {
        this.cuentas.update((lista) => lista.filter((cuenta) => cuenta._id !== cuentaId));
      })
    );
  }

  private normalizar(cuenta: CuentaBancoApi): CuentaBanco {
    return {
      _id: cuenta._id,
      id: cuenta.clave,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      saldoOrigen: cuenta.saldoOrigen,
      color: cuenta.color,
      icono: cuenta.icono,
      multiplicador: cuenta.multiplicador,
      fija: cuenta.fija,
      orden: cuenta.orden,
    };
  }
}
