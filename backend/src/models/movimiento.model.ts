import { Schema, model } from 'mongoose';

export interface IMovimiento {
  _id: string;
  id: number;
  fecha: Date;
  descripcion: string;
  categoria: string;
  ingreso: number;
  gasto: number;
  tipo: string;
  esFijo: boolean;
}

const movimientoSchema = new Schema<IMovimiento>(
  {
    fecha: {
      type: Date,
      required: true,
      default: Date.now
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
