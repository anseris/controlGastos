import type { Request, Response } from 'express';
import {
  CUENTAS_BANCO_POR_DEFECTO,
  CuentaBanco,
} from '../models/cuenta-banco.model.js';
import { idUsuario } from '../middleware/auth.middleware.js';

/**
 * Garantiza que el usuario tenga las cuentas base (ING, Revolut y Préstamo).
 * Las que falten se crean con saldo inicial 0; las existentes no se
 * sobreescriben para conservar los cambios hechos desde la interfaz.
 */
const asegurarCuentasBase = async (usuarioId: string): Promise<void> => {
  await Promise.all(
    CUENTAS_BANCO_POR_DEFECTO.map((cuenta) =>
      CuentaBanco.updateOne(
        { usuario: usuarioId, clave: cuenta.clave },
        { $setOnInsert: { ...cuenta, usuario: usuarioId, saldoOrigen: 0 } },
        { upsert: true }
      )
    )
  );
};

/** Convierte un nombre en una clave legible y única para ese usuario. */
const generarClave = async (nombre: string, usuarioId: string): Promise<string> => {
  const base =
    String(nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cuenta';

  let clave = base;
  let contador = 2;

  while (await CuentaBanco.exists({ usuario: usuarioId, clave })) {
    clave = `${base}-${contador}`;
    contador += 1;
  }

  return clave;
};

/** Siguiente orden de presentación dentro de las cuentas del usuario. */
const siguienteOrden = async (usuarioId: string): Promise<number> => {
  const ultima = await CuentaBanco.findOne({ usuario: usuarioId })
    .sort({ orden: -1 })
    .select('orden');
  return (ultima?.orden ?? 0) + 1;
};

// GET: listar las cuentas del usuario (crea las cuentas base si faltan)
export const getCuentasBanco = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = idUsuario(req);
    await asegurarCuentasBase(usuarioId);
    const cuentas = await CuentaBanco.find({ usuario: usuarioId }).sort({
      orden: 1,
      createdAt: 1,
    });
    res.status(200).json(cuentas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar las cuentas' });
  }
};

// GET: obtener una cuenta del usuario por su ID
export const getCuentaBancoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const cuenta = await CuentaBanco.findOne({
      _id: req.params['id'],
      usuario: idUsuario(req),
    });

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
    const usuarioId = idUsuario(req);
    const { nombre, tipo, saldoOrigen, color, icono } = req.body ?? {};

    const cuenta = await CuentaBanco.create({
      usuario: usuarioId,
      clave: await generarClave(nombre, usuarioId),
      nombre,
      tipo,
      saldoOrigen,
      color,
      icono,
      multiplicador: 1,
      fija: false,
      orden: await siguienteOrden(usuarioId),
    });

    res.status(201).json(cuenta);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo crear la cuenta' });
  }
};

// PUT: modificar una cuenta del usuario
export const updateCuentaBanco = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, tipo, saldoOrigen, color, icono } = req.body ?? {};

    const cambios: Record<string, unknown> = {};
    if (nombre !== undefined) cambios['nombre'] = nombre;
    if (tipo !== undefined) cambios['tipo'] = tipo;
    if (saldoOrigen !== undefined) cambios['saldoOrigen'] = saldoOrigen;
    if (color !== undefined) cambios['color'] = color;
    if (icono !== undefined) cambios['icono'] = icono;

    const cuenta = await CuentaBanco.findOneAndUpdate(
      { _id: req.params['id'], usuario: idUsuario(req) },
      cambios,
      {
        new: true,
        runValidators: true,
      }
    );

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
    const cuenta = await CuentaBanco.findOne({
      _id: req.params['id'],
      usuario: idUsuario(req),
    });

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
