import type { Request, Response } from 'express';
import {
  CUENTAS_BANCO_POR_DEFECTO,
  CuentaBanco,
} from '../models/cuenta-banco.model.js';

/**
 * Garantiza que existan las cuentas base (ING, Revolut y Préstamo).
 * Las que falten se crean con sus valores por defecto; las existentes no se
 * sobreescriben para conservar los cambios hechos desde la interfaz.
 */
const asegurarCuentasBase = async (): Promise<void> => {
  await Promise.all(
    CUENTAS_BANCO_POR_DEFECTO.map((cuenta) =>
      CuentaBanco.updateOne(
        { clave: cuenta.clave },
        { $setOnInsert: cuenta },
        { upsert: true }
      )
    )
  );
};

/** Convierte un nombre en una clave legible y única. */
const generarClave = async (nombre: string): Promise<string> => {
  const base =
    String(nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cuenta';

  let clave = base;
  let contador = 2;

  while (await CuentaBanco.exists({ clave })) {
    clave = `${base}-${contador}`;
    contador += 1;
  }

  return clave;
};

/** Siguiente orden de presentación. */
const siguienteOrden = async (): Promise<number> => {
  const ultima = await CuentaBanco.findOne().sort({ orden: -1 }).select('orden');
  return (ultima?.orden ?? 0) + 1;
};

// GET: listar las cuentas (crea las cuentas base si faltan)
export const getCuentasBanco = async (_req: Request, res: Response): Promise<void> => {
  try {
    await asegurarCuentasBase();
    const cuentas = await CuentaBanco.find().sort({ orden: 1, createdAt: 1 });
    res.status(200).json(cuentas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar las cuentas' });
  }
};

// GET: obtener una cuenta por su ID
export const getCuentaBancoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const cuenta = await CuentaBanco.findById(req.params['id']);

    if (!cuenta) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada' });
      return;
    }

    res.status(200).json(cuenta);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'ID de cuenta no válido' });
  }
};

// POST: crear una cuenta
export const createCuentaBanco = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, tipo, saldoOrigen, color, icono } = req.body ?? {};

    const cuenta = await CuentaBanco.create({
      clave: await generarClave(nombre),
      nombre,
      tipo,
      saldoOrigen,
      color,
      icono,
      multiplicador: 1,
      fija: false,
      orden: await siguienteOrden(),
    });

    res.status(201).json(cuenta);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo crear la cuenta' });
  }
};

// PUT: modificar una cuenta
export const updateCuentaBanco = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, tipo, saldoOrigen, color, icono } = req.body ?? {};

    const cambios: Record<string, unknown> = {};
    if (nombre !== undefined) cambios['nombre'] = nombre;
    if (tipo !== undefined) cambios['tipo'] = tipo;
    if (saldoOrigen !== undefined) cambios['saldoOrigen'] = saldoOrigen;
    if (color !== undefined) cambios['color'] = color;
    if (icono !== undefined) cambios['icono'] = icono;

    const cuenta = await CuentaBanco.findByIdAndUpdate(req.params['id'], cambios, {
      new: true,
      runValidators: true,
    });

    if (!cuenta) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada' });
      return;
    }

    res.status(200).json(cuenta);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo modificar la cuenta' });
  }
};

// DELETE: eliminar una cuenta propia (las cuentas base no se pueden borrar)
export const deleteCuentaBanco = async (req: Request, res: Response): Promise<void> => {
  try {
    const cuenta = await CuentaBanco.findById(req.params['id']);

    if (!cuenta) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada' });
      return;
    }

    if (cuenta.fija) {
      res.status(403).json({ mensaje: 'Las cuentas base no se pueden eliminar' });
      return;
    }

    await cuenta.deleteOne();
    res.status(200).json({ mensaje: 'Cuenta eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo eliminar la cuenta' });
  }
};
