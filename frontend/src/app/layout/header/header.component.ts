import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { AuthService } from '../../core/auth/auth.service';
import { MovimientosStore } from '../../services/movimientos-store';

@Component({
  selector: 'app-header',
  imports: [Button, CurrencyPipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly movimientosStore = inject(MovimientosStore);

  readonly usuario = this.auth.usuario;
  readonly inicial = computed(() => (this.usuario()?.nombre ?? '?').charAt(0).toUpperCase());
  readonly balanceHistorico = computed(() =>
    this.movimientosStore
      .movimientos()
      .reduce(
        (balance, movimiento) =>
          balance + Number(movimiento.ingreso || 0) - Number(movimiento.gasto || 0),
        0,
      ),
  );

  /** Cierra la sesión y vuelve a la pantalla de login. */
  cerrarSesion(): void {
    this.auth.cerrarSesion();
    // Recarga completa para descartar los datos del usuario anterior.
    window.location.assign('/login');
  }
}
