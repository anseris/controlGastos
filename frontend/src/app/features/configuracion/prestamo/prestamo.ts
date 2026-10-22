import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import {
  AmortizacionCuota,
  AmortizacionPrestamoService,
  EstadoCuota,
  calcularEstadoPrestamo,
} from '../../../services/amortizacion-prestamo';
import { BancosService, CuentaBanco } from '../../../services/bancos';
import {
  DatosGastoFijo,
  GastoFijo,
  GastosFijosService,
} from '../../../services/gastos-fijos';
import { MovimientosStore } from '../../../services/movimientos-store';

/** Categoría que se usa para los movimientos de ahorro (cuenta del préstamo). */
const CATEGORIA_AHORRO = 'Ahorro';

@Component({
  selector: 'app-prestamo',
  imports: [
    ButtonModule,
    TableModule,
    TagModule,
    SelectModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './prestamo.html',
  styleUrl: './prestamo.scss',
})
export class Prestamo implements OnInit {
  private readonly amortizacionService = inject(AmortizacionPrestamoService);
  private readonly bancos = inject(BancosService);
  private readonly gastosFijosService = inject(GastosFijosService);
  private readonly store = inject(MovimientosStore);
  private readonly messages = inject(MessageService);

  /** Cuotas del cuadro de amortización guardadas en la BBDD. */
  readonly cuotas = this.amortizacionService.cuotas;
  /** Cabecera del cuadro (datos del préstamo). */
  readonly datos = this.amortizacionService.datos;
  readonly cargando = this.amortizacionService.cargando;
  readonly error = this.amortizacionService.error;

  /** Indica que se está importando el Excel. */
  readonly importando = signal(false);
  /** Indica que se está sincronizando el gasto fijo de la cuota. */
  readonly sincronizando = signal(false);

  /** Cuentas de tipo préstamo de "Mis bancos". */
  readonly cuentasPrestamo = computed<CuentaBanco[]>(() =>
    this.bancos.cuentas().filter((cuenta) => cuenta.tipo === 'prestamo')
  );

  /** Cuenta del préstamo con la que se calculan los pagos. */
  readonly cuentaSeleccionada = signal<string>('');

  /** Cuenta del préstamo activa (la seleccionada o la primera disponible). */
  readonly cuentaPrestamo = computed<CuentaBanco | null>(() => {
    const cuentas = this.cuentasPrestamo();
    if (cuentas.length === 0) {
      return null;
    }
    return (
      cuentas.find((cuenta) => cuenta.id === this.cuentaSeleccionada()) ?? cuentas[0]
    );
  });

  /** Estado de pago de cada cuota (se resaltan las ya amortizadas). */
  readonly estados = computed<EstadoCuota[]>(() =>
    calcularEstadoPrestamo(
      this.cuotas(),
      this.datos(),
      this.store.movimientos(),
      this.cuentaPrestamo()?.id ?? null
    ).estados
  );

  /** Resumen del préstamo (capital pendiente, amortizado, cuota del mes...). */
  readonly resumen = computed(
    () =>
      calcularEstadoPrestamo(
        this.cuotas(),
        this.datos(),
        this.store.movimientos(),
        this.cuentaPrestamo()?.id ?? null
      ).resumen
  );

  /**
   * Gasto fijo que corresponde a la cuota del préstamo.
   *
   * Se busca, por este orden: el marcado como cuota de préstamo, el que ya
   * imputa sus movimientos a la cuenta del préstamo y, por último, el que lo
   * dice su descripción ("Cuota préstamo").
   */
  readonly gastoFijoCuota = computed<GastoFijo | null>(() => {
    const gastos = this.gastosFijosService.gastosFijos();
    const cuentaId = this.cuentaPrestamo()?.id ?? '';

    const marcado = gastos.find((gasto) => gasto.esCuotaPrestamo);
    if (marcado) {
      return marcado;
    }

    const deLaCuenta = gastos.find(
      (gasto) => !!cuentaId && gasto.tipoAhorro === cuentaId
    );
    if (deLaCuenta) {
      return deLaCuenta;
    }

    return (
      gastos.find((gasto) =>
        /cuota.*pr[eé]stamo|pr[eé]stamo.*cuota/i.test(gasto.descripcion)
      ) ?? null
    );
  });

  /** Cuota seleccionada para aplicarla al gasto fijo. */
  readonly cuotaSeleccionada = signal<string>('');

  /** Cuota del mes en curso (o la primera) usada como valor por defecto. */
  private readonly cuotaPorDefecto = computed<string>(() => {
    const prefijo = new Date().toISOString().slice(0, 7);
    return (
      this.cuotas().find((cuota) => cuota.fecha.startsWith(prefijo))?.fecha ??
      this.cuotas()[0]?.fecha ??
      ''
    );
  });

  /** Cuota (objeto) seleccionada. */
  readonly cuotaActualSeleccionada = computed<AmortizacionCuota | null>(() => {
    const clave = this.cuotaSeleccionada() || this.cuotaPorDefecto();
    return this.cuotas().find((cuota) => cuota.fecha === clave) ?? null;
  });

  /** Opciones del selector de cuota (una por fila del cuadro). */
  readonly opcionesCuota = computed(() =>
    this.cuotas().map((cuota) => ({
      label: `${this.formatoFecha(cuota.fecha)} · ${cuota.cuota.toFixed(2)} €`,
      value: cuota.fecha,
    }))
  );

  /** Opciones del selector de cuenta de "Mis bancos". */
  readonly opcionesCuenta = computed(() =>
    this.cuentasPrestamo().map((cuenta) => ({ label: cuenta.nombre, value: cuenta.id }))
  );

  ngOnInit(): void {
    this.amortizacionService.cargar().subscribe();
    this.bancos.cargar().subscribe();
    this.gastosFijosService.cargar().subscribe();
    this.store.cargar().subscribe();
  }

  /** Formatea `aaaa-mm-dd` como `dd/mm/aaaa`. */
  private formatoFecha(fecha: string): string {
    if (!fecha || fecha.length < 10) {
      return fecha;
    }
    return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`;
  }

  /** Importa el Excel que el usuario ha seleccionado en el navegador. */
  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    this.importando.set(true);

    const lector = new FileReader();
    lector.onload = () => {
      const contenido = String(lector.result ?? '');
      this.amortizacionService
        .importar(contenido)
        .subscribe({
          next: (resultado) => this.finalizaImportacion(resultado.mensaje),
          error: (err) => this.errorImportacion(err),
        });
    };
    lector.onerror = () => {
      this.importando.set(false);
      this.messages.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se ha podido leer el archivo seleccionado.',
      });
    };
    lector.readAsDataURL(archivo);

    // Permite volver a seleccionar el mismo archivo.
    input.value = '';
  }

  /** Importa el `CuadroDeAmortizacion.XLS` que está en el proyecto. */
  importarDelProyecto(): void {
    this.importando.set(true);

    this.amortizacionService.importar().subscribe({
      next: (resultado) => this.finalizaImportacion(resultado.mensaje),
      error: (err) => this.errorImportacion(err),
    });
  }

  private finalizaImportacion(mensaje: string): void {
    this.importando.set(false);
    this.gastosFijosService.cargar(true).subscribe();
    this.store.cargar(true).subscribe();
    this.messages.add({
      severity: 'success',
      summary: 'Cuadro importado',
      detail: mensaje,
    });
  }

  private errorImportacion(err: unknown): void {
    this.importando.set(false);
    console.error('Error al importar el cuadro de amortización:', err);
    this.messages.add({
      severity: 'error',
      summary: 'Error',
      detail:
        (err as { error?: { mensaje?: string } })?.error?.mensaje ??
        'No se ha podido importar el cuadro de amortización.',
    });
  }

  /** Sincroniza el importe del gasto fijo de la cuota con el cuadro. */
  sincronizarCuota(): void {
    this.sincronizando.set(true);

    this.amortizacionService.sincronizar().subscribe({
      next: (resultado) => {
        this.sincronizando.set(false);
        this.gastosFijosService.cargar(true).subscribe();
        this.messages.add({
          severity: 'success',
          summary: 'Sincronizado',
          detail: resultado.mensaje,
        });
      },
      error: (err) => {
        this.sincronizando.set(false);
        console.error('Error al sincronizar la cuota:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail:
            (err as { error?: { mensaje?: string } })?.error?.mensaje ??
            'No se ha podido sincronizar la cuota.',
        });
      },
    });
  }

  /**
   * Crea (o actualiza) el gasto fijo de la cuota con el importe de la fila
   * seleccionada del cuadro de amortización.
   */
  aplicarCuotaAlGastoFijo(): void {
    const cuota = this.cuotaActualSeleccionada();
    const cuenta = this.cuentaPrestamo();

    if (!cuota) {
      this.messages.add({
        severity: 'warn',
        summary: 'Sin cuota',
        detail: 'Selecciona una cuota del cuadro de amortización.',
      });
      return;
    }

    const existente = this.gastoFijoCuota();

    const datos: DatosGastoFijo = {
      dia: Number(cuota.fecha.slice(8, 10)),
      descripcion:
        existente?.descripcion ||
        `Cuota ${this.datos()?.descripcion || 'del préstamo'}`,
      categoria: existente?.categoria || CATEGORIA_AHORRO,
      importe: cuota.cuota,
      tipo: 'gasto',
      activo: true,
      // El movimiento se imputa a la cuenta del préstamo: así "Mis bancos"
      // sabe qué parte de la cuota amortiza capital.
      tipoAhorro: cuenta?.id ?? existente?.tipoAhorro ?? '',
      esCuotaPrestamo: true,
    };

    const peticion$ = existente
      ? this.gastosFijosService.actualizar(existente._id, datos)
      : this.gastosFijosService.agregar(datos);

    peticion$.subscribe({
      next: () => {
        this.gastosFijosService.cargar(true).subscribe();
        this.store.cargar(true).subscribe();
        this.messages.add({
          severity: 'success',
          summary: existente ? 'Gasto fijo actualizado' : 'Gasto fijo creado',
          detail: `La cuota de ${cuota.cuota.toFixed(2)} € se aplica el día ${
            datos.dia
          } de cada mes.`,
        });
      },
      error: (err) => {
        console.error('Error al guardar el gasto fijo de la cuota:', err);
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail:
            (err as { error?: { mensaje?: string } })?.error?.mensaje ??
            'No se ha podido guardar el gasto fijo de la cuota.',
        });
      },
    });
  }

  /** Diferencia entre el importe del gasto fijo y la cuota seleccionada. */
  readonly importeDesfasado = computed<number | null>(() => {
    const gasto = this.gastoFijoCuota();
    const cuota = this.cuotaActualSeleccionada();

    if (!gasto || !cuota) {
      return null;
    }

    return Math.round((gasto.importe - cuota.cuota) * 100) / 100;
  });

  /** Etiqueta del estado de una cuota. */
  etiquetaEstado(estado: EstadoCuota): string {
    if (estado.liquidada) {
      return 'Pagada';
    }
    if (estado.pagado > 0) {
      return 'Parcial';
    }
    return 'Pendiente';
  }

  /** Severidad del estado (para el color de la etiqueta). */
  severidadEstado(estado: EstadoCuota): 'success' | 'warn' | 'secondary' {
    if (estado.liquidada) {
      return 'success';
    }
    if (estado.pagado > 0) {
      return 'warn';
    }
    return 'secondary';
  }
}
