import { Schema, model } from 'mongoose';

export interface IMovimiento {
  _id: string;
  id: number;
  /** Fecha en formato string `aaaa-mm-dd`. */
  fecha: string;
  descripcion: string;
  categoria: string;
  tipoAhorro: string;
  ingreso: number;
  gasto: number;
  tipo: string;
  esFijo: boolean;
  /**
   * Clave del presupuesto de origen (`casa` | `ahorro` | `para-mi`).
   * Solo se rellena en los traspasos de sobrante a cuentas de ahorro: permite
   * descontar el importe traspasado del pendiente de su presupuesto.
   */
  presupuestoClave: string;
  /**
   * Id del gasto fijo (`gastos_fijos`) que originó el movimiento.
   * Cadena vac��a = movimiento manual.
   */
  gastoFijoId: string;
}

/** Normaliza cualquier fecha (Date, ISO, Date.now) a `aaaa-mm-dd`. */
const toFechaString = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1] as string;
    }
  }
  return new Date().toISOString().slice(0, 10);
};

const movimientoSchema = new Schema<IMovimiento>(
  {
    fecha: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato aaaa-mm-dd'],
      set: toFechaString,
      default: () => new Date().toISOString().slice(0, 10)
    },
    descripcion: {
      type: String,
      trim: true
    },
    
    categoria: {
      type: String,
      required: true,
      trim: true
    }, 
     tipoAhorro: {
      type: String,
      // enum: ['ing', 'revolut', 'prestamo', ''],
      trim: true
    },
    presupuestoClave: {
      type: String,
      trim: true,
      default: ''
    },
    ingreso: {
      type: Number,
      required: true,
      min: 0
    },
    gasto: {
      type: Number,
      required: true,
      min: 0
    },
     tipo: {
      type: String,
      enum: ['ingreso', 'gasto'],
      required: true
    },
     esFijo: {
      type: Boolean,
      required: true,
      default: false
    },
    gastoFijoId: {
      type: String,
      trim: true,
      default: ''
    },
  },
  {
    timestamps: true,
    collection: 'movimientos'
  }
);

export const Movimiento = model<IMovimiento>(
  'Movimiento',
  movimientoSchema
);
