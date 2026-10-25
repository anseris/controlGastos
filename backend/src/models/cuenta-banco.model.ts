import { Schema, model } from 'mongoose';

/** Tipos de cuenta admitidos en "Mis bancos". */
export const TIPOS_CUENTA_BANCO = ['ahorro', 'prestamo'] as const;
export type TipoCuentaBanco = (typeof TIPOS_CUENTA_BANCO)[number];

export interface ICuentaBanco {
  _id: string;
  /** Id del usuario propietario de la cuenta. */
  usuario: string;
  /**
   * Identificador estable que se guarda en `movimiento.tipoAhorro`.
   * No cambia aunque se renombre la cuenta.
   */
  clave: string;
  nombre: string;
  tipo: TipoCuentaBanco;
  /** Saldo inicial (ahorro) o total estipulado (préstamo). */
  saldoOrigen: number;
  /** Color en formato hexadecimal (p. ej. '#22C55E'). */
  color: string;
  /** Clase de PrimeIcons (p. ej. 'pi pi-wallet'). */
  icono: string;
  /** Multiplicador del ahorro (Revolut = 2, resto = 1). */
  multiplicador: number;
  /** Las cuentas base no se pueden eliminar. */
  fija: boolean;
  /** Orden de presentación de las cards. */
  orden: number;
}

/**
 * Cuentas que se crean automáticamente la primera vez.
 * Las claves coinciden con los valores históricos de `movimiento.tipoAhorro`.
 */
export const CUENTAS_BANCO_POR_DEFECTO: Array<Omit<ICuentaBanco, '_id' | 'usuario'>> = [
  {
    clave: 'ing',
    nombre: 'ING Ahorro',
    tipo: 'ahorro',
    saldoOrigen: 2525.81,
    color: '#ff6b00',
    icono: 'pi pi-wallet',
    multiplicador: 1,
    fija: true,
    orden: 1,
  },
  {
    clave: 'revolut',
    nombre: 'Revolut',
    tipo: 'ahorro',
    saldoOrigen: 165.45,
    color: '#111827',
    icono: 'pi pi-credit-card',
    multiplicador: 2,
    fija: true,
    orden: 2,
  },
  {
    clave: 'prestamo',
    nombre: 'Préstamo',
    tipo: 'prestamo',
    saldoOrigen: 1705.73,
    color: '#3b82f6',
    icono: 'pi pi-building',
    multiplicador: 1,
    fija: true,
    orden: 3,
  },
];

const cuentaBancoSchema = new Schema<ICuentaBanco>(
  {
    usuario: { type: String, required: true, trim: true },
    clave: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    tipo: {
      type: String,
      enum: [...TIPOS_CUENTA_BANCO],
      required: true,
      default: 'ahorro',
    },
    saldoOrigen: { type: Number, required: true, min: 0, default: 0 },
    color: { type: String, trim: true, default: '#3B82F6' },
    icono: { type: String, trim: true, default: 'pi pi-wallet' },
    multiplicador: { type: Number, default: 1, min: 1 },
    fija: { type: Boolean, default: false },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'cuentas-banco' }
);

// La clave es única dentro de las cuentas de cada usuario.
cuentaBancoSchema.index({ usuario: 1, clave: 1 }, { unique: true });

export const CuentaBanco = model<ICuentaBanco>('CuentaBanco', cuentaBancoSchema);
