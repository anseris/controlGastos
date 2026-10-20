import { Schema, model } from 'mongoose';

/** Claves fijas de los tres presupuestos de la aplicación. */
export const CLAVES_PRESUPUESTO = ['casa', 'ahorro', 'para-mi'] as const;
export type ClavePresupuesto = (typeof CLAVES_PRESUPUESTO)[number];

export interface IPresupuesto {
  _id: string;
  /** Identificador fijo: casa | ahorro | para-mi. */
  clave: ClavePresupuesto;
  nombre: string;
  /** Porcentaje de los ingresos del mes asignado a este presupuesto. */
  porcentaje: number;
  /** Nombres de categorías cuyos gastos descuentan de este presupuesto. */
  categorias: string[];
  /** Orden de presentación de las cards. */
  orden: number;
}

/**
 * Presupuestos que se crean automáticamente la primera vez.
 * El porcentaje por defecto es 33,3 % de los ingresos del mes.
 */
export const PRESUPUESTOS_POR_DEFECTO: Array<Omit<IPresupuesto, '_id'>> = [
  { clave: 'casa', nombre: 'Casa', porcentaje: 33.3, categorias: [], orden: 1 },
  { clave: 'ahorro', nombre: 'Ahorro', porcentaje: 33.3, categorias: [], orden: 2 },
  { clave: 'para-mi', nombre: 'Para mi', porcentaje: 33.3, categorias: [], orden: 3 },
];

const presupuestoSchema = new Schema<IPresupuesto>(
  {
    clave: {
      type: String,
      required: true,
      unique: true,
      enum: [...CLAVES_PRESUPUESTO],
    },
    nombre: { type: String, required: true, trim: true },
    porcentaje: { type: Number, required: true, min: 0, max: 100, default: 33.3 },
    categorias: { type: [String], default: [] },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'presupuestos' }
);

export const Presupuesto = model<IPresupuesto>('Presupuesto', presupuestoSchema);
