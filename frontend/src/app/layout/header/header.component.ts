import { Component, computed, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  imports: [Button],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);

  readonly usuario = this.auth.usuario;
  readonly inicial = computed(() => (this.usuario()?.nombre ?? '?').charAt(0).toUpperCase());

  /** Cierra la sesión y vuelve a la pantalla de login. */
  cerrarSesion(): void {
    this.auth.cerrarSesion();
    // Recarga completa para descartar los datos del usuario anterior.
    window.location.assign('/login');
  }
}
