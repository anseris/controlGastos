import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SesionService } from '../auth/sesion.service';

/**
 * Protege las rutas privadas: sin sesión redirige a `/login`
 * guardando la ruta solicitada en `returnUrl`.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const sesion = inject(SesionService);
  const router = inject(Router);

  if (sesion.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
