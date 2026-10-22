import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';

import { Presupuestos } from './presupuestos';
import { MovimientosStore } from '../../services/movimientos-store';

describe('Presupuestos', () => {
  let component: Presupuestos;
  let fixture: ComponentFixture<Presupuestos>;
  let httpMock: HttpTestingController;
  let store: MovimientosStore;

  /** Mes actual en formato `aaaa-mm`. */
  const mesActual = (() => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  })();

  const presupuestoCasa = {
    _id: 'p1',
    clave: 'casa',
    nombre: 'Casa',
    porcentaje: 100,
    categorias: [],
    diaTransferencia: 1,
    cuentaTransferencia: 'ing',
    orden: 1,
  };

  const cuentaIng = {
    _id: 'c1',
    clave: 'ing',
    nombre: 'ING Ahorro',
    tipo: 'ahorro',
    saldoOrigen: 0,
    color: '#ff6b00',
    icono: 'pi pi-wallet',
    multiplicador: 1,
    fija: true,
    orden: 1,
  };

  const cuentaPrestamo = {
    _id: 'c2',
    clave: 'prestamo',
    nombre: 'Préstamo',
    tipo: 'prestamo',
    saldoOrigen: 1000,
    color: '#3b82f6',
    icono: 'pi pi-building',
    multiplicador: 1,
    fija: true,
    orden: 2,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Presupuestos],
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MovimientosStore);
    fixture = TestBed.createComponent(Presupuestos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  /**
   * Busca una petición por su ruta final (la URL base puede cambiar entre
   * desarrollo y producción sin romper los tests).
   */
  function esperar(ruta: string) {
    return httpMock.expectOne((req) => req.url.endsWith(`/api${ruta}`));
  }

  /** Responde a las peticiones que hace el componente al iniciarse. */
  function cargarInicial(
    movimientos: unknown[] = [],
    presupuestos: unknown[] = [presupuestoCasa],
    cuentas: unknown[] = [cuentaIng]
  ) {
    esperar('/movimientos').flush(movimientos);
    esperar('/presupuestos').flush(presupuestos);
    esperar('/categorias').flush([]);
    esperar('/cuentas-banco').flush(cuentas);
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
    cargarInicial();
  });

  it('descuenta del pendiente el sobrante ya traspasado', () => {
    cargarInicial([
      { _id: 'm1', fecha: `${mesActual}-05`, descripcion: 'Sueldo', categoria: 'Sueldo', ingreso: 1000, gasto: 0, tipo: 'ingreso', esFijo: false },
      { _id: 'm2', fecha: `${mesActual}-06`, descripcion: 'Traspaso', categoria: 'Ahorro', tipoAhorro: 'ing', ingreso: 0, gasto: 250, tipo: 'gasto', esFijo: false, presupuestoClave: 'casa' },
    ]);

    const resumen = component.resumen();
    expect(resumen[0].importeAsignado).toBe(1000);
    expect(resumen[0].importeTraspasado).toBe(250);
    expect(resumen[0].importePendiente).toBe(750);
  });

  it('no deja traspasar el sobrante dos veces en el mismo mes', () => {
    cargarInicial([
      { _id: 'm1', fecha: `${mesActual}-05`, descripcion: 'Sueldo', categoria: 'Sueldo', ingreso: 1000, gasto: 0, tipo: 'ingreso', esFijo: false },
      { _id: 'm2', fecha: `${mesActual}-06`, descripcion: 'Traspaso', categoria: 'Ahorro', tipoAhorro: 'ing', ingreso: 0, gasto: 1000, tipo: 'gasto', esFijo: false, presupuestoClave: 'casa' },
    ]);

    expect(component.resumen()[0].importePendiente).toBe(0);
    expect(component.puedeTraspasar(component.resumen()[0])).toBeFalsy();
  });

  it('registra el traspaso como un movimiento de ahorro con la fecha del umbral', () => {
    cargarInicial([
      { _id: 'm1', fecha: `${mesActual}-05`, descripcion: 'Sueldo', categoria: 'Sueldo', ingreso: 1000, gasto: 0, tipo: 'ingreso', esFijo: false },
    ]);

    component.abrirTraspaso(component.presupuestos()[0]);
    expect(component.showTraspaso).toBe(true);
    expect(component.filasTraspaso().length).toBe(1);
    expect(component.filasTraspaso()[0].importe).toBe(1000);

    component.confirmarTraspaso();

    const peticion = esperar('/movimientos');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body.categoria).toBe('Ahorro');
    expect(peticion.request.body.tipoAhorro).toBe('ing');
    expect(peticion.request.body.gasto).toBe(1000);
    expect(peticion.request.body.tipo).toBe('gasto');
    expect(peticion.request.body.presupuestoClave).toBe('casa');
    expect(peticion.request.body.fecha).toBe(`${mesActual}-01`);
    peticion.flush({});

    // El componente recarga los movimientos tras el traspaso.
    esperar('/movimientos').flush([]);
  });

  it('permite traspasar solo la cantidad indicada por el usuario', () => {
    cargarInicial([
      { _id: 'm1', fecha: `${mesActual}-05`, descripcion: 'Sueldo', categoria: 'Sueldo', ingreso: 1000, gasto: 0, tipo: 'ingreso', esFijo: false },
    ]);

    component.abrirTraspaso(component.presupuestos()[0]);
    component.filasTraspaso()[0].importe = 250;
    component.confirmarTraspaso();

    const peticion = esperar('/movimientos');
    expect(peticion.request.body.gasto).toBe(250);
    peticion.flush({});

    esperar('/movimientos').flush([]);
  });

  it('no deja traspasar más importe del disponible', () => {
    cargarInicial([
      { _id: 'm1', fecha: `${mesActual}-05`, descripcion: 'Sueldo', categoria: 'Sueldo', ingreso: 1000, gasto: 0, tipo: 'ingreso', esFijo: false },
    ]);

    component.abrirTraspaso(component.presupuestos()[0]);
    component.filasTraspaso()[0].importe = 1500;
    expect(component.traspasoValido()).toBeFalsy();

    // Con un importe inválido no se registra ningún movimiento.
    component.confirmarTraspaso();
    httpMock.expectNone((req) => req.url.endsWith('/api/movimientos'));
  });

  it('ofrece el préstamo como cuenta de destino del traspaso', () => {
    cargarInicial([], [presupuestoCasa], [cuentaIng, cuentaPrestamo]);

    const valores = component.cuentasDestinoOptions().map((opcion) => opcion.value);
    expect(valores).toContain('ing');
    expect(valores).toContain('prestamo');
    expect(component.esPrestamo('prestamo')).toBe(true);
    expect(component.esPrestamo('ing')).toBe(false);
  });

  it('amortiza el préstamo al traspasarle el sobrante', () => {
    cargarInicial(
      [
        { _id: 'm1', fecha: `${mesActual}-05`, descripcion: 'Sueldo', categoria: 'Sueldo', ingreso: 1000, gasto: 0, tipo: 'ingreso', esFijo: false },
      ],
      [{ ...presupuestoCasa, cuentaTransferencia: 'prestamo' }],
      [cuentaIng, cuentaPrestamo]
    );

    component.abrirTraspaso(component.presupuestos()[0]);
    expect(component.filasTraspaso()[0].cuenta).toBe('prestamo');

    component.actualizarImporte('casa', 300);
    expect(component.traspasoValido()).toBe(true);
    expect(component.deudaTraspaso()).toBe(300);
    expect(component.saldoTraspaso()).toBe(0);

    component.confirmarTraspaso();

    const peticion = esperar('/movimientos');
    expect(peticion.request.body.categoria).toBe('Ahorro');
    expect(peticion.request.body.tipoAhorro).toBe('prestamo');
    expect(peticion.request.body.gasto).toBe(300);
    expect(peticion.request.body.tipo).toBe('gasto');
    expect(peticion.request.body.presupuestoClave).toBe('casa');
    peticion.flush({});

    esperar('/movimientos').flush([]);
  });

  it('no permite traspasar en un mes que todavía no ha llegado', () => {
    cargarInicial([]);

    const mesSiguiente = (() => {
      const ahora = new Date();
      const siguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
      return `${siguiente.getFullYear()}-${String(siguiente.getMonth() + 1).padStart(2, '0')}`;
    })();
    store.seleccionarMes(mesSiguiente);
    fixture.detectChanges();

    expect(component.transferible()).toBeFalsy();
    expect(component.puedeTraspasarTodo()).toBeFalsy();
  });
});
