/**
 * Cálculo del estado del préstamo a partir del cuadro de amortización y de
 * los movimientos de la cuenta.
 *
 * Está en un módulo aparte (sin dependencias de Angular) para poder
 * comprobarlo de forma aislada.
 */

/** Una cuota del cuadro de amortización (colección `amortizacion_prestamo`). */
export interface AmortizacionCuota {
  _id: string;
  /** Número de cuota del préstamo (60, 61, 62...). */
  mes: number;
  /** Fecha del cargo (aaaa-mm-dd). */
  fecha: string;
  /** Parte de la cuota que amortiza capital (lo que se descuenta en la card). */
  amortizacionCapital: number;
  /** Parte de la cuota que son intereses. */
  interesPagado: number;
  /** Cuota total del mes (es el importe del gasto fijo). */
  cuota: number;
  /** Capital pendiente después de pagar esta cuota. */
  capitalPendiente: number;
}

/** Cabecera del cuadro de amortización (colección `prestamo_cuadro`). */
export interface PrestamoCuadro {
  _id: string;
  descripcion: string;
  cuenta: string;
  titular: string;
  periodo: string;
  capitalInicial: number;
  capitalPendienteInicial: number;
  fechaFirma: string;
  fechaFin: string;
  importadoEn: string;
}

/** Movimiento mínimo que necesita el cálculo. */
export interface MovimientoPago {
  /** Fecha en formato `aaaa-mm-dd`. */
  fecha: string;
  /** Clave de la cuenta de "Mis bancos" (p. ej. 'prestamo'). */
  tipoAhorro?: string;
  /** Importe del gasto. */
  gasto?: number;
  /** Indica que lo generó un gasto fijo. */
  esFijo?: boolean;
  /** Id del gasto fijo que originó el movimiento. */
  gastoFijoId?: string;
}

/** Estado de una cuota según los movimientos ya pagados. */
export interface EstadoCuota {
  cuota: AmortizacionCuota;
  /** Importe pagado en el mes de la cuota. */
  pagado: number;
  /** Parte del pago que amortiza capital. */
  amortizado: number;
  /** Parte del pago que es capital extra (por encima de la cuota). */
  extra: number;
  /** La cuota está totalmente pagada. */
  liquidada: boolean;
}

/** Resumen del préstamo que se muestra en "Mis bancos". */
export interface ResumenPrestamo {
  /** Capital inicial del préstamo (total). */
  capitalInicial: number;
  /** Capital pendiente actual (ya descontadas las cuotas y los traspasos). */
  capitalPendiente: number;
  /** Capital ya amortizado (total - pendiente). */
  amortizado: number;
  /** % amortizado sobre el total. */
  porcentaje: number;
  /** Cuota del mes en curso o la próxima pendiente. */
  cuotaActual: AmortizacionCuota | null;
  /** Amortización de capital acumulada dentro del cuadro. */
  amortizadoPeriodo: number;
  /** Intereses pagados acumulados. */
  intereses: number;
  /** Cuotas totalmente pagadas. */
  cuotasPagadas: number;
  /** Número total de cuotas del cuadro. */
  totalCuotas: number;
  /** Aportaciones extra de capital (traspasos fuera de cuota). */
  extras: number;
  /** Total pagado (cuotas + aportaciones extra). */
  pagado: number;
}

/** Fecha de hoy en formato `aaaa-mm-dd` (hora local). */
const hoy = (): string => {
  const ahora = new Date();
  return (
    `${ahora.getFullYear()}-` +
    `${String(ahora.getMonth() + 1).padStart(2, '0')}-` +
    `${String(ahora.getDate()).padStart(2, '0')}`
  );
};

/** Mes actual en formato `aaaa-mm`. */
const mesActual = (): string => hoy().slice(0, 7);

/** Redondea a dos decimales (evita los arrastres de la coma flotante). */
const redondear = (valor: number): number => Math.round(valor * 100) / 100;

/**
 * Calcula el estado de pago de cada cuota y el resumen del préstamo.
 *
 * Los pagos se detectan por los movimientos que están apuntados a la cuenta
 * del préstamo (`movimiento.tipoAhorro`):
 *
 * - Cada movimiento de un mes con cuota cubre primero la cuota de ese mes; el
 *   capital que amortiza es el de la columna "Amortización capital" (los
 *   intereses no restan deuda) y el sobrante es capital extra.
 * - Los traspasos manuales a meses sin cuota son aportaciones extra de capital
 *   y también descuentan del capital pendiente.
 * - Las cuotas pagadas en meses anteriores al cuadro ya están reflejadas en el
 *   capital pendiente inicial, así que no se vuelven a descontar.
 */
export const calcularEstadoPrestamo = (
  cuotas: AmortizacionCuota[],
  datos: PrestamoCuadro | null,
  movimientos: MovimientoPago[],
  cuentaClave: string | null
): { estados: EstadoCuota[]; resumen: ResumenPrestamo | null } => {
  if (cuotas.length === 0) {
    return { estados: [], resumen: null };
  }

  // Pagos a la cuenta del préstamo agrupados por mes (aaaa-mm).
  // Se separa lo que viene de un gasto fijo (la cuota) de los traspasos
  // manuales: las cuotas de meses anteriores al cuadro ya están reflejadas
  // en el capital pendiente inicial, los traspasos manuales no.
  const pagosPorMes = new Map<string, { total: number; cuota: number }>();
  if (cuentaClave) {
    for (const movimiento of movimientos) {
      if (!movimiento.tipoAhorro || movimiento.tipoAhorro !== cuentaClave) {
        continue;
      }
      const importe = movimiento.gasto || 0;
      const mes = (movimiento.fecha || '').slice(0, 7);
      if (importe <= 0 || !mes) {
        continue;
      }

      const previo = pagosPorMes.get(mes) ?? { total: 0, cuota: 0 };
      previo.total += importe;
      if (movimiento.gastoFijoId || movimiento.esFijo) {
        previo.cuota += importe;
      }
      pagosPorMes.set(mes, previo);
    }
  }

  const mesesConCuota = new Set<string>();
  const estados: EstadoCuota[] = [];

  let amortizadoPeriodo = 0;
  let intereses = 0;
  let cuotasPagadas = 0;
  let extras = 0;
  let pagado = 0;

  for (const cuota of cuotas) {
    const mes = cuota.fecha.slice(0, 7);
    mesesConCuota.add(mes);

    const importePagado = pagosPorMes.get(mes)?.total ?? 0;
    const amortizado = Math.min(importePagado, cuota.amortizacionCapital);
    const extra = Math.max(0, importePagado - cuota.cuota);
    const liquidada = importePagado + 0.005 >= cuota.cuota;

    if (importePagado > 0) {
      amortizadoPeriodo += amortizado;
      intereses += cuota.interesPagado;
      if (liquidada) {
        cuotasPagadas++;
        pagado += cuota.cuota;
      }
    }

    extras += extra;

    estados.push({ cuota, pagado: importePagado, amortizado, extra, liquidada });
  }

  // Aportaciones a meses que no tienen cuota (traspasos manuales al préstamo).
  // Las cuotas de meses anteriores al cuadro ya están reflejadas en el
  // capital pendiente inicial, así que no se vuelven a descontar.
  for (const [mes, pago] of pagosPorMes) {
    if (!mesesConCuota.has(mes)) {
      const traspaso = Math.max(0, pago.total - pago.cuota);
      extras += traspaso;
      pagado += traspaso;
    }
  }

  const capitalInicial = datos?.capitalInicial ?? 0;
  const capitalPendienteInicial =
    datos?.capitalPendienteInicial ??
    (cuotas[0]?.capitalPendiente ?? 0) + (cuotas[0]?.amortizacionCapital ?? 0);

  const capitalPendiente = redondear(
    Math.max(0, capitalPendienteInicial - amortizadoPeriodo - extras)
  );
  const amortizado =
    capitalInicial > 0
      ? redondear(capitalInicial - capitalPendiente)
      : redondear(amortizadoPeriodo + extras);
  const porcentaje = capitalInicial > 0 ? (amortizado / capitalInicial) * 100 : 0;

  const cuotaActual =
    cuotas.find((cuota) => cuota.fecha.startsWith(mesActual())) ??
    estados.find((estado) => !estado.liquidada)?.cuota ??
    cuotas[cuotas.length - 1];

  return {
    estados,
    resumen: {
      capitalInicial,
      capitalPendiente,
      amortizado,
      porcentaje,
      cuotaActual,
      amortizadoPeriodo: redondear(amortizadoPeriodo),
      intereses: redondear(intereses),
      cuotasPagadas,
      totalCuotas: cuotas.length,
      extras: redondear(extras),
      pagado: redondear(pagado),
    },
  };
};
