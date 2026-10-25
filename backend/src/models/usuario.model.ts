import { Schema, model } from 'mongoose';

export interface IUsuario {
  _id: string;
  nombre: string;
  email: string;
  /** Hash bcrypt de la contraseña (nunca se guarda en texto plano). */
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const usuarioSchema = new Schema<IUsuario>(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      // No se devuelve en las consultas salvo que se pida con .select('+password').
      select: false
    }
  },
  {
    timestamps: true,
    collection: 'usuarios'
  }
);

export const Usuario = model<IUsuario>('Usuario', usuarioSchema);
