import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { ResumenMensual } from './resumen-mensual';
import { MovimientosStore } from '../../../services/movimientos-store';

describe('ResumenMensual', () => {
  let component: ResumenMensual;
  let fixture: ComponentFixture<ResumenMensual>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenMensual],
      providers: [
        {
          provide: MovimientosStore,
          useValue: {
            movimientos: () => [],
            movimientosFiltrados: () => [],
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenMensual);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

});
