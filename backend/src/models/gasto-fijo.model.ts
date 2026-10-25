import { Schema, model } from 'mongoose';

export interface IGastoFijo {
  _id: string;
  /** Id del usuario propietario del gasto fijo. */
  usuario: string;
  dia: number;
  descripcion: string;
  categoria: string;
  importe: number;
  tipo: string;
  activo: boolean;
  /**
   * Clave de la cuenta de "Mis bancos" a la que se imputa el movimiento
   * (p. ej. 'prestamo'). Cadena vacía = movimiento sin cuenta.
   */
  tipoAhorro: string;
  /**
   * Marca el gasto fijo como la cuota de un préstamo: su importe se sincroniza
   * con la columna "Cuota" del cuadro de amortización.
   */
  esCuotaPrestamo: boolean;
}

const gastoFijoSchema = new Schema<IGastoFijo>(
  {
    usuario: {
      type: String,
      required: true,
      trim: true,
    },
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
    tipoAhorro: {
      type: String,
      trim: true,
      default: '',
    },
    esCuotaPrestamo: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'gastos_fijos',
  }
);

gastoFijoSchema.index({ usuario: 1, dia: 1 });

export const GastoFijo = model<IGastoFijo>('GastoFijo', gastoFijoSchema);
