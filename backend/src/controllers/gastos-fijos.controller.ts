import type { Request, Response } from 'express';
import { GastoFijo, type IGastoFijo } from '../models/gasto-fijo.model.js';
import { Movimiento } from '../models/movimiento.model.js';

/** Detecta el error de índice único de MongoDB. */
const esNombreDuplicado = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === 11000;

// GET: listar todos los gastos fijos
export const getGastosFijos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const gastosFijos = await GastoFijo.find().sort({ dia: 1, descripcion: 1 });
    res.status(200).json(gastosFijos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar los gastos fijos' });
  }
};

// GET: obtener un gasto fijo por su ID
export const getGastoFijoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const gastoFijo = await GastoFijo.findById(req.params['id']);

    if (!gastoFijo) {
      res.status(404).json({ mensaje: 'Gasto fijo no encontrado' });
      return;
    }

    res.status(200).json(gastoFijo);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'ID de gasto fijo no válido' });
  }
};

// POST: crear un gasto fijo
export const createGastoFijo = async (req: Request, res: Response): Promise<void> => {
  try {
    const gastoFijo = await GastoFijo.create(req.body);

    // Se genera ya su movimiento en el mes actual para que aparezca en la tabla.
    await sincronizarMovimientoDelMes(gastoFijo, new Date());

    res.status(201).json(gastoFijo);
  } catch (error) {
    if (esNombreDuplicado(error)) {
      res.status(409).json({ mensaje: 'Ya existe un gasto fijo con esos datos' });
      return;
    }
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo crear el gasto fijo' });
  }
};

// PUT: modificar un gasto fijo
export const updateGastoFijo = async (req: Request, res: Response): Promise<void> => {
  try {
    const gastoFijo = await GastoFijo.findByIdAndUpdate(req.params['id'], req.body, {
      new: true,
      runValidators: true,
    });

    if (!gastoFijo) {
      res.status(404).json({ mensaje: 'Gasto fijo no encontrado' });
      return;
    }

    // El movimiento ya generado del mes actual se actualiza con los nuevos datos.
    await sincronizarMovimientoDelMes(gastoFijo, new Date());

    res.status(200).json(gastoFijo);
  } catch (error) {
    if (esNombreDuplicado(error)) {
      res.status(409).json({ mensaje: 'Ya existe un gasto fijo con esos datos' });
      return;
    }
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo modificar el gasto fijo' });
  }
};

// DELETE: eliminar un gasto fijo
export const deleteGastoFijo = async (req: Request, res: Response): Promise<void> => {
  try {
    const gastoFijo = await GastoFijo.findByIdAndDelete(req.params['id']);

    if (!gastoFijo) {
      res.status(404).json({ mensaje: 'Gasto fijo no encontrado' });
      return;
    }

    // Se eliminan los movimientos que generó este gasto fijo.
    const { deletedCount } = await Movimiento.deleteMany({
      gastoFijoId: String(gastoFijo._id),
    });

    res.status(200).json({
      mensaje: 'Gasto fijo eliminado correctamente',
      movimientosEliminados: deletedCount ?? 0,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo eliminar el gasto fijo' });
  }
};

// POST: generar manualmente los movimientos del mes actual
export const generarMovimientosGastosFijos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await generarGastosFijosDelMes(new Date());

    res.status(200).json({
      mensaje:
        resultado.generados > 0
          ? `Se han generado ${resultado.generados} movimientos.`
          : 'No hay gastos fijos nuevos que generar este mes.',
      ...resultado,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al generar los movimientos de gastos fijos' });
  }
};

/**
 * Crea en la tabla de movimientos los gastos fijos activos que todavía no
 * tengan movimiento en el mes indicado. La fecha usa el día configurado,
 * ajustado al último día del mes cuando el mes es más corto (p. ej. el 31).
 */
export const generarGastosFijosDelMes = async (
  referencia: Date
): Promise<{ generados: number; movimientos: unknown[] }> => {
  const gastosFijos = await GastoFijo.find({ activo: true });
  const movimientos: unknown[] = [];

  if (gastosFijos.length === 0) {
    return { generados: 0, movimientos };
  }

  const year = referencia.getFullYear();
  const mes = String(referencia.getMonth() + 1).padStart(2, '0');
  const prefijoMes = `${year}-${mes}`;

  for (const gastoFijo of gastosFijos) {
    // Solo se crea si el gasto fijo no tiene ya un movimiento este mes.
    const existente = await Movimiento.findOne({
      gastoFijoId: String(gastoFijo._id),
      fecha: { $regex: `^${prefijoMes}` },
    });

    if (existente) {
      continue;
    }

    const movimiento = await crearMovimientoDesdeGastoFijo(gastoFijo, referencia);
    movimientos.push(movimiento);
  }

  return { generados: movimientos.length, movimientos };
};

/**
 * Crea el movimiento de un gasto fijo para el mes indicado.
 * El día se ajusta al último día del mes cuando el mes es más corto.
 */
const crearMovimientoDesdeGastoFijo = async (
  gastoFijo: IGastoFijo,
  referencia: Date
) => {
  const year = referencia.getFullYear();
  const mes = String(referencia.getMonth() + 1).padStart(2, '0');
  const ultimoDia = new Date(year, referencia.getMonth() + 1, 0).getDate();
  const dia = Math.min(gastoFijo.dia, ultimoDia);
  const fecha = `${year}-${mes}-${String(dia).padStart(2, '0')}`;

  return Movimiento.create({
    fecha,
    descripcion: gastoFijo.descripcion,
    categoria: gastoFijo.categoria,
    tipoAhorro: '',
    ingreso: 0,
    gasto: gastoFijo.importe,
    tipo: 'gasto',
    esFijo: true,
    presupuestoClave: '',
    gastoFijoId: String(gastoFijo._id),
  });
};

/**
 * Crea o actualiza el movimiento del mes actual de un gasto fijo.
 * Se usa al crear o editar un gasto fijo para que la tabla de movimientos
 * refleje siempre los datos más recientes.
 */
export const sincronizarMovimientoDelMes = async (
  gastoFijo: IGastoFijo,
  referencia: Date
): Promise<void> => {
  const year = referencia.getFullYear();
  const mes = String(referencia.getMonth() + 1).padStart(2, '0');
  const prefijoMes = `${year}-${mes}`;

  const existente = await Movimiento.findOne({
    gastoFijoId: String(gastoFijo._id),
    fecha: { $regex: `^${prefijoMes}` },
  });

  const ultimoDia = new Date(year, referencia.getMonth() + 1, 0).getDate();
  const dia = Math.min(gastoFijo.dia, ultimoDia);
  const fecha = `${year}-${mes}-${String(dia).padStart(2, '0')}`;

  if (existente) {
    // Si el gasto fijo se ha desactivado, se borra su movimiento del mes.
    if (!gastoFijo.activo) {
      await Movimiento.deleteOne({ _id: existente._id });
      return;
    }

    existente.fecha = fecha;
    existente.descripcion = gastoFijo.descripcion;
    existente.categoria = gastoFijo.categoria;
    existente.gasto = gastoFijo.importe;
    existente.ingreso = 0;
    existente.tipo = 'gasto';
    existente.esFijo = true;
    await existente.save();
    return;
  }

  // Los gastos fijos inactivos no generan movimiento.
  if (!gastoFijo.activo) {
    return;
  }

  await crearMovimientoDesdeGastoFijo(gastoFijo, referencia);
};
