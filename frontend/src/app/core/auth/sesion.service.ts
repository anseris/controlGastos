import { computed, Injectable, signal } from '@angular/core';

/** Usuario tal y como lo devuelve el backend (`/api/auth`). */
export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
}

const TOKEN_KEY = 'control-gastos-token';
const USUARIO_KEY = 'control-gastos-usuario';

/** localStorage solo existe en el navegador (la app se renderiza en cliente). */
function almacen(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function leerTokenGuardado(): string | null {
  return almacen()?.getItem(TOKEN_KEY) ?? null;
}

function leerUsuarioGuardado(): UsuarioSesion | null {
  const guardado = almacen()?.getItem(USUARIO_KEY);

  if (!guardado) {
    return null;
  }

  try {
    const usuario = JSON.parse(guardado) as Partial<UsuarioSesion>;

    if (usuario && usuario.id && usuario.email) {
      return {
        id: usuario.id,
        nombre: usuario.nombre ?? '',
        email: usuario.email
      };
    }
  } catch {
    // Datos corruptos: se descartan y se pedirá volver a iniciar sesión.
  }

  return null;
}

/**
 * Estado de la sesión (token + usuario) expuesto con signals.
 * No depende de `HttpClient`, por lo que puede usarse desde el interceptor
 * de autenticación sin crear dependencias circulares.
 */
@Injectable({
  providedIn: 'root'
})
export class SesionService {
  private readonly tokenSignal = signal<string | null>(leerTokenGuardado());
  private readonly usuarioSignal = signal<UsuarioSesion | null>(leerUsuarioGuardado());

  readonly token = this.tokenSignal.asReadonly();
  readonly usuario = this.usuarioSignal.asReadonly();
  readonly autenticado = computed(() => !!this.tokenSignal());

  /** Guarda el token y el usuario de una sesión recién iniciada. */
  guardar(token: string, usuario: UsuarioSesion): void {
    almacen()?.setItem(TOKEN_KEY, token);
    almacen()?.setItem(USUARIO_KEY, JSON.stringify(usuario));
    this.tokenSignal.set(token);
    this.usuarioSignal.set(usuario);
  }

  /** Elimina la sesión del navegador. */
  cerrar(): void {
    almacen()?.removeItem(TOKEN_KEY);
    almacen()?.removeItem(USUARIO_KEY);
    this.tokenSignal.set(null);
    this.usuarioSignal.set(null);
  }

  /** Token actual (para la cabecera `Authorization`). */
  obtenerToken(): string | null {
    return this.tokenSignal();
  }
}
