import type { Request, Response } from 'express';
import {
  PRESUPUESTOS_POR_DEFECTO,
  Presupuesto,
  type ClavePresupuesto,
} from '../models/presupuesto.model.js';

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

// PUT: modificar porcentaje y/o categorías de un presupuesto por su clave
export const updatePresupuesto = async (req: Request, res: Response): Promise<void> => {
  const clave = req.params['clave'] as ClavePresupuesto;
  const { porcentaje, categorias } = req.body ?? {};

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

    await presupuesto.save();

    res.status(200).json(presupuesto);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo modificar el presupuesto' });
  }
};
