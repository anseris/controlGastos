import { Schema, model, type InferSchemaType } from 'mongoose';

/** Tipos de categoría admitidos (en minúsculas, igual que en movimientos). */
export const TIPOS_CATEGORIA = ['gasto', 'ingreso'] as const;
export type TipoCategoria = (typeof TIPOS_CATEGORIA)[number];

const categoriaSchema = new Schema(
  {
    /** Id del usuario propietario de la categoría. */
    usuario: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    tipo: {
      type: String,
      enum: [...TIPOS_CATEGORIA],
      required: true,
      default: 'gasto',
    },
    /** Clase de PrimeIcons (p. ej. 'pi pi-home'). Cadena vacía = sin icono. */
    icono: { type: String, trim: true, default: '' },
    /** Color en formato hexadecimal (p. ej. '#22C55E'). */
    color: { type: String, trim: true, default: '' },
    hasIcono: { type: Boolean, default: false },
    primeraLetra: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'categorias' }
);

// Cada usuario puede tener su propia categoría con el mismo nombre.
categoriaSchema.index({ usuario: 1, nombre: 1 }, { unique: true });

export type Categoria = InferSchemaType<typeof categoriaSchema>;

export const Categoria = model('Categoria', categoriaSchema);
