import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../core/auth/auth.service';

type ModoAuth = 'login' | 'registro';

const PASSWORD_MIN_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pantalla pública de acceso: permite iniciar sesión o crear una cuenta.
 * Si ya hay sesión, redirige directamente a la ruta solicitada.
 */
@Component({
  selector: 'app-auth-page',
  imports: [FormsModule, InputTextModule],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss'
})
export class AuthPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);

  modo: ModoAuth = 'login';
  submitted = false;
  cargando = false;
  error = '';
  readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  mostrarPasswordLogin = false;
  mostrarPasswordRegistro = false;

  formLogin = { email: '', password: '' };
  formRegistro = { nombre: '', email: '', password: '', confirmar: '' };

  ngOnInit(): void {
    if (this.auth.autenticado()) {
      void this.router.navigateByUrl(this.returnUrl);
    }
  }

  /** Ruta a la que volver después del login (por defecto, movimientos). */
  get returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');

    if (url && url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }

    return '/movimientos';
  }

  cambiarModo(modo: ModoAuth): void {
    if (this.modo === modo) {
      return;
    }

    this.modo = modo;
    this.submitted = false;
    this.error = '';
  }

  iniciarSesion(): void {
    this.submitted = true;
    this.error = '';

    const email = this.formLogin.email.trim().toLowerCase();
    const password = this.formLogin.password;

    if (!EMAIL_REGEX.test(email) || !password) {
      return;
    }

    this.cargando = true;

    this.auth.iniciarSesion({ email, password }).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.messages.add({
          severity: 'success',
          summary: 'Sesión iniciada',
          detail: `Bienvenido de nuevo, ${respuesta.usuario.nombre}.`
        });
        this.irAlInicio();
      },
      error: (error: unknown) => {
        this.cargando = false;
        this.error = this.mensajeError(error, 'No se pudo iniciar sesión.');
        this.messages.add({
          severity: 'error',
          summary: 'Error al iniciar sesión',
          detail: this.error
        });
      }
    });
  }

  crearCuenta(): void {
    this.submitted = true;
    this.error = '';

    const nombre = this.formRegistro.nombre.trim();
    const email = this.formRegistro.email.trim().toLowerCase();
    const password = this.formRegistro.password;

    if (
      nombre.length < 2 ||
      !EMAIL_REGEX.test(email) ||
      password.length < PASSWORD_MIN_LENGTH ||
      password !== this.formRegistro.confirmar
    ) {
      return;
    }

    this.cargando = true;

    this.auth.registrar({ nombre, email, password }).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.messages.add({
          severity: 'success',
          summary: 'Cuenta creada',
          detail: `Bienvenido, ${respuesta.usuario.nombre}. Tu cuenta ya está lista.`
        });
        this.irAlInicio();
      },
      error: (error: unknown) => {
        this.cargando = false;
        this.error = this.mensajeError(error, 'No se pudo crear la cuenta.');
        this.messages.add({
          severity: 'error',
          summary: 'Error al crear la cuenta',
          detail: this.error
        });
      }
    });
  }

  /**
   * Recarga la aplicación en la ruta de destino.
   *
   * Es importante hacer una carga completa: los servicios de datos guardan
   * la información en memoria y, al cambiar de cuenta, no debe reutilizarse
   * la caché del usuario anterior.
   */
  private irAlInicio(): void {
    window.location.assign(this.returnUrl);
  }

  /** Mensaje de error devuelto por el backend (`{ mensaje }`). */
  private mensajeError(error: unknown, porDefecto: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor. Comprueba que el backend esté arrancado.';
      }

      if (error.status === 404) {
        return 'El servidor no tiene habilitada la autenticación. Actualiza y despliega el backend.';
      }
    }

    const mensaje = (error as { error?: { mensaje?: string } })?.error?.mensaje;
    return mensaje || porDefecto;
  }
}
