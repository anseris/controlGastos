import { Schema, model } from 'mongoose';

export interface IGastoFijo {
  _id: string;
  dia: number;
  descripcion: string;
  categoria: string;
  importe: number;
  tipo: string;
  activo: boolean;
}

const gastoFijoSchema = new Schema<IGastoFijo>(
  {
    dia: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
    importe: {
      type: Number,
      required: true,
      min: 0,
    },
    tipo: {
      type: String,
      enum: ['gasto'],
      required: true,
      default: 'gasto',
    },
    activo: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'gastos_fijos',
  }
);

export const GastoFijo = model<IGastoFijo>('GastoFijo', gastoFijoSchema);
