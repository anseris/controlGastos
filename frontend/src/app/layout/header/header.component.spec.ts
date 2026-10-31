import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { MovimientosStore } from '../../services/movimientos-store';
import type { Movimiento } from '../../services/movimientos';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  const movimientos = signal<Movimiento[]>([]);
  const movimientosDelPeriodo = signal<Movimiento[]>([]);

  beforeEach(async () => {
    movimientos.set([]);
    movimientosDelPeriodo.set([]);
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: { usuario: signal(null), cerrarSesion: () => undefined } },
        { provide: MovimientosStore, useValue: { movimientos, movimientosFiltrados: movimientosDelPeriodo } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    await fixture.whenStable();
  });

  it('shows the all-time balance regardless of the selected month', () => {
    movimientos.set([crearMovimiento(2000, 500), crearMovimiento(300, 100)]);
    fixture.detectChanges();

    expect(fixture.componentInstance.balanceHistorico()).toBe(1700);
    expect(fixture.nativeElement.textContent).toContain('1,700.00');

    movimientosDelPeriodo.set([crearMovimiento(50, 100)]);
    movimientos.set([crearMovimiento(50, 100)]);
    fixture.detectChanges();
    expect(fixture.componentInstance.balanceHistorico()).toBe(-50);
    expect(fixture.nativeElement.textContent).toContain('-€50.00');
  });
});

function crearMovimiento(ingreso: number, gasto: number): Movimiento {
  return {
    _id: `${ingreso}-${gasto}`,
    fecha: '2026-01-15',
    descripcion: 'Movimiento de prueba',
    categoria: 'Otros',
    tipoAhorro: '',
    ingreso,
    gasto,
    tipo: gasto > 0 ? 'gasto' : 'ingreso',
    esFijo: false,
  };
}
