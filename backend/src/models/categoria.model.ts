import { Schema, model, type InferSchemaType } from 'mongoose';

const categoriaSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    descripcion: { type: String, trim: true, default: '' },
    activa: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type Categoria = InferSchemaType<typeof categoriaSchema>;

export const Categoria = model('Categoria', categoriaSchema);
