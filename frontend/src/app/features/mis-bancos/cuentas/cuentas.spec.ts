import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Cuentas } from './cuentas';
import { AmortizacionPrestamoService } from '../../../services/amortizacion-prestamo';
import { BancosService, type CuentaBanco } from '../../../services/bancos';
import type { Movimiento } from '../../../services/movimientos';
import { MovimientosService } from '../../../services/movimientos';
import { MovimientosStore } from '../../../services/movimientos-store';

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

describe('Cuentas', () => {
  let component: Cuentas;
  let fixture: ComponentFixture<Cuentas>;
  const movimientos = signal<Movimiento[]>([
    crearMovimiento('ahorro', 150),
    crearMovimiento('ingreso', 300),
  ]);
  const cuentas = signal<CuentaBanco[]>([crearCuentaIng()]);
  const store = {
    movimientos,
    movimientosFiltrados: movimientos,
    cargando: signal(false),
    error: signal(''),
    mesSeleccionado: signal(MES_ACTUAL),
    cargar: vi.fn(() => of(movimientos())),
  };
  const bancos = {
    cuentas,
    cargando: signal(false),
    error: signal(''),
    cargar: vi.fn(() => of(cuentas())),
  };
  const movimientosService = {
    crearMovimiento: vi.fn((movimiento: Partial<Movimiento>) =>
      of({ ...crearMovimiento('ingreso', Number(movimiento.ingreso)), ...movimiento }),
    ),
  };
  const amortizacion = {
    cuotas: signal([]),
    datos: signal(null),
    cargar: vi.fn(() => of([])),
  };
  const messages = { add: vi.fn() };

  beforeEach(async () => {
    movimientos.set([crearMovimiento('ahorro', 150), crearMovimiento('ingreso', 300)]);
    await TestBed.configureTestingModule({
      imports: [Cuentas],
      providers: [
        { provide: MovimientosStore, useValue: store },
        { provide: BancosService, useValue: bancos },
        { provide: MessageService, useValue: messages },
        { provide: AmortizacionPrestamoService, useValue: amortizacion },
        { provide: MovimientosService, useValue: movimientosService },
      ],
    }).compileComponents();

    movimientosService.crearMovimiento.mockClear();
    fixture = TestBed.createComponent(Cuentas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('subtracts linked income transfers from ING savings', () => {
    expect(component.saldoIng()).toBeCloseTo(2375.81);
    component.seleccionar('ing');
    expect(component.detalle()).toHaveLength(2);
    expect(component.importeDetalle(component.detalle()[1])).toBe(300);
  });

  it('records a transfer as income and rejects amounts above the available balance', () => {
    component.importeTraspaso = component.saldoIng() + 1;
    component.guardarTraspaso();
    expect(movimientosService.crearMovimiento).not.toHaveBeenCalled();

    component.importeTraspaso = 250;
    component.guardarTraspaso();

    expect(movimientosService.crearMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: 'traspaso de ahorro ING a cuenta principal',
        categoria: 'Otros Ingresos',
        tipoAhorro: 'ing',
        ingreso: 250,
        gasto: 0,
        tipo: 'ingreso',
      }),
    );
    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Traspaso realizado' }),
    );
  });
});

function crearCuentaIng(): CuentaBanco {
  return {
    _id: 'account-ing',
    id: 'ing',
    nombre: 'ING Ahorro',
    tipo: 'ahorro',
    saldoOrigen: 2525.81,
    color: '#ff6b00',
    icono: 'pi pi-wallet',
    multiplicador: 1,
    fija: true,
    orden: 1,
  };
}

function crearMovimiento(
  tipo: 'ahorro' | 'ingreso',
  importe: number,
): Movimiento {
  const fecha = `${MES_ACTUAL}-15`;
  const esIngreso = tipo === 'ingreso';
  return {
    _id: `${tipo}-${importe}`,
    fecha,
    descripcion: esIngreso ? 'traspaso de ahorro ING a cuenta principal' : 'Ahorro mensual',
    categoria: esIngreso ? 'Otros Ingresos' : 'Ahorro',
    tipoAhorro: 'ing',
    ingreso: esIngreso ? importe : 0,
    gasto: esIngreso ? 0 : importe,
    tipo: esIngreso ? 'ingreso' : 'gasto',
    esFijo: false,
  };
}
