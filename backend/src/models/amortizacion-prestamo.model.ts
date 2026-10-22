import { Schema, model } from 'mongoose';

/**
 * Cabecera del cuadro de amortización del préstamo.
 *
 * Guarda los datos que vienen en las primeras filas del Excel
 * ("Préstamo Naranja", capital inicial, capital pendiente, fechas...).
 * Solo se guarda un documento (clave `principal`).
 */
export interface IPrestamoCuadro {
  _id: string;
  /** Descripción del préstamo (p. ej. 'Préstamo Naranja'). */
  descripcion: string;
  /** Número de cuenta del préstamo. */
  cuenta: string;
  /** Titular del préstamo. */
  titular: string;
  /** Periodo del cuadro ('03/12/2021 - 03/11/2028'). */
  periodo: string;
  /** Capital inicial del préstamo (26.000 €). */
  capitalInicial: number;
  /** Capital pendiente al inicio del cuadro (1.637,69 €). */
  capitalPendienteInicial: number;
  /** Fecha de firma del préstamo (aaaa-mm-dd). */
  fechaFirma: string;
  /** Fecha de finalización del préstamo (aaaa-mm-dd). */
  fechaFin: string;
  /** Fecha de la última importación del Excel (aaaa-mm-dd). */
  importadoEn: string;
}

/**
 * Una cuota del cuadro de amortización.
 *
 * - `cuota`: lo que se paga cada mes (es el importe del gasto fijo).
 * - `amortizacionCapital`: la parte de la cuota que descuenta deuda
 *   (es lo que se descuenta en la card de préstamo de "Mis bancos").
 * - `interesPagado`: la parte de la cuota que es intereses.
 */
export interface IAmortizacionCuota {
  _id: string;
  /** Número de cuota del préstamo (60, 61, 62...). */
  mes: number;
  /** Fecha del cargo (aaaa-mm-dd). */
  fecha: string;
  /** Parte de la cuota que amortiza capital. */
  amortizacionCapital: number;
  /** Parte de la cuota que son intereses. */
  interesPagado: number;
  /** Cuota total del mes. */
  cuota: number;
  /** Capital pendiente después de pagar esta cuota. */
  capitalPendiente: number;
}

const prestamoCuadroSchema = new Schema<IPrestamoCuadro>(
  {
    descripcion: { type: String, trim: true, default: 'Préstamo' },
    cuenta: { type: String, trim: true, default: '' },
    titular: { type: String, trim: true, default: '' },
    periodo: { type: String, trim: true, default: '' },
    capitalInicial: { type: Number, default: 0, min: 0 },
    capitalPendienteInicial: { type: Number, default: 0, min: 0 },
    fechaFirma: { type: String, trim: true, default: '' },
    fechaFin: { type: String, trim: true, default: '' },
    importadoEn: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    collection: 'prestamo_cuadro',
  }
);

const amortizacionCuotaSchema = new Schema<IAmortizacionCuota>(
  {
    mes: { type: Number, required: true, min: 0 },
    fecha: { type: String, required: true, trim: true },
    amortizacionCapital: { type: Number, required: true, min: 0, default: 0 },
    interesPagado: { type: Number, required: true, min: 0, default: 0 },
    cuota: { type: Number, required: true, min: 0, default: 0 },
    capitalPendiente: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    timestamps: true,
    collection: 'amortizacion_prestamo',
  }
);

export const PrestamoCuadro = model<IPrestamoCuadro>(
  'PrestamoCuadro',
  prestamoCuadroSchema
);

export const AmortizacionCuota = model<IAmortizacionCuota>(
  'AmortizacionCuota',
  amortizacionCuotaSchema
);
