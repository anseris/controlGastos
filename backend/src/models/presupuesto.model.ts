import { Schema, model } from 'mongoose';

/** Claves fijas de los tres presupuestos de la aplicación. */
export const CLAVES_PRESUPUESTO = ['casa', 'ahorro', 'para-mi'] as const;
export type ClavePresupuesto = (typeof CLAVES_PRESUPUESTO)[number];

export interface IPresupuesto {
  _id: string;
  /** Id del usuario propietario del presupuesto. */
  usuario: string;
  /** Identificador fijo: casa | ahorro | para-mi. */
  clave: ClavePresupuesto;
  nombre: string;
  /** Porcentaje de los ingresos del mes asignado a este presupuesto. */
  porcentaje: number;
  /** Nombres de categorías cuyos gastos descuentan de este presupuesto. */
  categorias: string[];
  /** Día del mes (1-31) a partir del cual se puede traspasar el sobrante a un ahorro. */
  diaTransferencia: number;
  /** Clave de la cuenta de ahorro (`cuentas-banco.clave`) destino del traspaso. */
  cuentaTransferencia: string;
  /** Orden de presentación de las cards. */
  orden: number;
}

/** Día del mes por defecto para habilitar los traspasos de sobrante. */
export const DIA_TRANSFERENCIA_POR_DEFECTO = 25;

/**
 * Presupuestos que se crean automáticamente la primera vez.
 * El porcentaje por defecto es 33,3 % de los ingresos del mes.
 */
export const PRESUPUESTOS_POR_DEFECTO: Array<Omit<IPresupuesto, '_id' | 'usuario'>> = [
  {
    clave: 'casa',
    nombre: 'Casa',
    porcentaje: 33.3,
    categorias: [],
    diaTransferencia: DIA_TRANSFERENCIA_POR_DEFECTO,
    cuentaTransferencia: '',
    orden: 1,
  },
  {
    clave: 'ahorro',
    nombre: 'Ahorro',
    porcentaje: 33.3,
    categorias: [],
    diaTransferencia: DIA_TRANSFERENCIA_POR_DEFECTO,
    cuentaTransferencia: '',
    orden: 2,
  },
  {
    clave: 'para-mi',
    nombre: 'Para mi',
    porcentaje: 33.3,
    categorias: [],
    diaTransferencia: DIA_TRANSFERENCIA_POR_DEFECTO,
    cuentaTransferencia: '',
    orden: 3,
  },
];

const presupuestoSchema = new Schema<IPresupuesto>(
  {
    usuario: { type: String, required: true, trim: true },
    clave: {
      type: String,
      required: true,
      enum: [...CLAVES_PRESUPUESTO],
    },
    nombre: { type: String, required: true, trim: true },
    porcentaje: { type: Number, required: true, min: 0, max: 100, default: 33.3 },
    categorias: { type: [String], default: [] },
    diaTransferencia: {
      type: Number,
      min: 1,
      max: 31,
      default: DIA_TRANSFERENCIA_POR_DEFECTO,
    },
    cuentaTransferencia: { type: String, trim: true, default: '' },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'presupuestos' }
);

// Cada usuario tiene sus propios presupuestos casa/ahorro/para-mi.
presupuestoSchema.index({ usuario: 1, clave: 1 }, { unique: true });

export const Presupuesto = model<IPresupuesto>('Presupuesto', presupuestoSchema);
