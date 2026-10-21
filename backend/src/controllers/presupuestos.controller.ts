import type { Request, Response } from 'express';
import {
  PRESUPUESTOS_POR_DEFECTO,
  Presupuesto,
  type ClavePresupuesto,
} from '../models/presupuesto.model.js';
import { CuentaBanco } from '../models/cuenta-banco.model.js';

/**
 * Garantiza que existan los tres presupuestos base (Casa, Ahorro, Para mi).
 * Los que falten se crean con su porcentaje por defecto y sin categorías.
 */
const asegurarPresupuestos = async () => {
  const existentes = await Presupuesto.find();
  const claves = new Set(existentes.map((p) => p.clave));
  const faltantes = PRESUPUESTOS_POR_DEFECTO.filter((p) => !claves.has(p.clave));

  if (faltantes.length > 0) {
    await Presupuesto.insertMany(faltantes);
  }

  return Presupuesto.find().sort({ orden: 1 });
};

/** Comprueba que un día del mes sea válido (entre 1 y 31). */
const esDiaValido = (dia: unknown): dia is number => {
  const numero = Number(dia);
  return Number.isInteger(numero) && numero >= 1 && numero <= 31;
};

/** Comprueba que la cuenta de ahorro destino exista (si se indica alguna). */
const existeCuenta = async (clave: string): Promise<boolean> => {
  if (!clave) {
    return true;
  }
  return (await CuentaBanco.exists({ clave })) !== null;
};

// GET: listar los presupuestos (crea los que falten)
export const getPresupuestos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const presupuestos = await asegurarPresupuestos();
    res.status(200).json(presupuestos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar los presupuestos' });
  }
};

// PUT: modificar porcentaje, categorías y/o datos de traspaso de un presupuesto
export const updatePresupuesto = async (req: Request, res: Response): Promise<void> => {
  const clave = req.params['clave'] as ClavePresupuesto;
  const { porcentaje, categorias, diaTransferencia, cuentaTransferencia } = req.body ?? {};

  try {
    const presupuesto = await Presupuesto.findOne({ clave });

    if (!presupuesto) {
      res.status(404).json({ mensaje: 'Presupuesto no encontrado' });
      return;
    }

    if (porcentaje !== undefined) {
      presupuesto.porcentaje = porcentaje;
    }
    if (categorias !== undefined) {
      presupuesto.categorias = categorias;
    }
    if (diaTransferencia !== undefined) {
      if (!esDiaValido(diaTransferencia)) {
        res.status(400).json({ mensaje: 'El día de traspaso debe estar entre 1 y 31' });
        return;
      }
      presupuesto.diaTransferencia = Number(diaTransferencia);
    }
    if (cuentaTransferencia !== undefined) {
      const cuenta = String(cuentaTransferencia ?? '').trim();
      if (!(await existeCuenta(cuenta))) {
        res.status(400).json({ mensaje: 'La cuenta de ahorro seleccionada no existe' });
        return;
      }
      presupuesto.cuentaTransferencia = cuenta;
    }

    await presupuesto.save();

    res.status(200).json(presupuesto);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo modificar el presupuesto' });
  }
};

// PUT: cambiar el día de traspaso de todos los presupuestos a la vez
export const updateDiaTransferencia = async (req: Request, res: Response): Promise<void> => {
  const { dia } = req.body ?? {};

  if (!esDiaValido(dia)) {
    res.status(400).json({ mensaje: 'El día de traspaso debe estar entre 1 y 31' });
    return;
  }

  try {
    await asegurarPresupuestos();
    await Presupuesto.updateMany({}, { $set: { diaTransferencia: Number(dia) } });
    const presupuestos = await Presupuesto.find().sort({ orden: 1 });
    res.status(200).json(presupuestos);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo actualizar el día de traspaso' });
  }
};
