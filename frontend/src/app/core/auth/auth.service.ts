import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE } from '../api-base';
import { SesionService, type UsuarioSesion } from './sesion.service';

export interface CredencialesLogin {
  email: string;
  password: string;
}

export interface DatosRegistro {
  nombre: string;
  email: string;
  password: string;
}

/** Respuesta de `/api/auth/login` y `/api/auth/registro`. */
export interface RespuestaAuth {
  token: string;
  usuario: UsuarioSesion;
}

/**
 * Autenticación contra el backend (`/api/auth`).
 * Espeja los endpoints definidos en `backend/src/routes/auth.routes.ts`.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);

  /** Usuario de la sesión actual (`null` si no hay sesión). */
  readonly usuario = this.sesion.usuario;
  /** Indica si hay una sesión iniciada. */
  readonly autenticado = this.sesion.autenticado;

  /** POST /api/auth/login — inicia sesión y guarda el token. */
  iniciarSesion(credenciales: CredencialesLogin): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${API_BASE}/auth/login`, credenciales)
      .pipe(tap((respuesta) => this.sesion.guardar(respuesta.token, respuesta.usuario)));
  }

  /** POST /api/auth/registro — crea una cuenta e inicia sesión. */
  registrar(datos: DatosRegistro): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${API_BASE}/auth/registro`, datos)
      .pipe(tap((respuesta) => this.sesion.guardar(respuesta.token, respuesta.usuario)));
  }

  /** Cierra la sesión en el navegador. */
  cerrarSesion(): void {
    this.sesion.cerrar();
  }
}
