import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ResumenAnual } from './resumen-anual';
import { CategoriasService, type Categoria } from '../../../services/categorias';
import { MovimientosStore } from '../../../services/movimientos-store';
import type { Movimiento } from '../../../services/movimientos';

describe('ResumenAnual', () => {
  let component: ResumenAnual;
  let fixture: ComponentFixture<ResumenAnual>;
  const movimientos = signal<Movimiento[]>([]);
  const store = {
    movimientos,
    cargando: signal(false),
    error: signal(''),
    cargar: () => of([]),
  };
  const categoriasService = {
    obtenerCategorias: () => of([] as Categoria[]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenAnual],
      providers: [
        { provide: MovimientosStore, useValue: store },
        { provide: CategoriasService, useValue: categoriasService },
      ],
    }).compileComponents();

    movimientos.set([]);
    fixture = TestBed.createComponent(ResumenAnual);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groups the selected year expenses by month and category', () => {
    movimientos.set([
      crearMovimiento('2025-01-05', 'Casa', 450),
      crearMovimiento('2025-01-20', 'Casa', 50),
      crearMovimiento('2025-03-01', 'Comida', 120),
      crearMovimiento('2024-01-01', 'Casa', 999),
      crearMovimiento('2025-02-01', 'Sueldo', 900, 'ingreso'),
    ]);
    component.anioSeleccionado.set(2025);
    component.categorias.set([crearCategoria('Casa', '#123456')]);

    const chart = component.datosGrafico();

    expect(chart.labels).toHaveLength(12);
    expect(chart.datasets).toHaveLength(2);
    expect(chart.datasets[0].label).toBe('Casa');
    expect(chart.datasets[0].data[0]).toBe(500);
    expect(chart.datasets[0].data[1]).toBe(0);
    expect(chart.datasets[0].backgroundColor).toBe('#123456');
    expect(chart.datasets[1].label).toBe('Comida');
    expect(chart.datasets[1].data[2]).toBe(120);
  });

  it('offers years with movements and filters the chart when the year changes', () => {
    movimientos.set([
      crearMovimiento('2024-02-05', 'Casa', 200),
      crearMovimiento('2023-02-05', 'Casa', 100),
    ]);

    expect(component.aniosDisponibles().map((option) => option.value)).toContain(2024);
    expect(component.aniosDisponibles().map((option) => option.value)).toContain(2023);

    component.anioSeleccionado.set(2024);
    expect(component.datosGrafico().datasets[0].data[1]).toBe(200);
    component.anioSeleccionado.set(2023);
    expect(component.datosGrafico().datasets[0].data[1]).toBe(100);
  });
});

function crearMovimiento(
  fecha: string,
  categoria: string,
  gasto: number,
  tipo = 'gasto',
): Movimiento {
  return {
    _id: `${fecha}-${categoria}`,
    fecha,
    descripcion: categoria,
    categoria,
    tipoAhorro: '',
    ingreso: 0,
    gasto,
    tipo,
    esFijo: false,
  };
}

function crearCategoria(nombre: string, color: string): Categoria {
  return {
    _id: nombre,
    nombre,
    tipo: 'gasto',
    icono: '',
    color,
    hasIcono: false,
    primeraLetra: nombre[0] ?? '',
  };
}
