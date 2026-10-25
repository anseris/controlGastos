import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SesionService } from '../auth/sesion.service';

/**
 * Añade el token JWT a todas las peticiones protegidas y, si el backend
 * responde 401, cierra la sesión y envía al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);

  // Las llamadas de login/registro no llevan token y sus 401 son credenciales erróneas.
  const esRutaAuth = /\/auth\/(login|registro)$/.test(req.url);
  const token = sesion.obtenerToken();

  const peticion =
    token && !esRutaAuth
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !esRutaAuth) {
        sesion.cerrar();
        void router.navigate(['/login'], {
          queryParams: { returnUrl: router.url }
        });
      }

      return throwError(() => error);
    })
  );
};
