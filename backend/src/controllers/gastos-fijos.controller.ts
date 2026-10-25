import type { Request, Response } from 'express';
import { GastoFijo, type IGastoFijo } from '../models/gasto-fijo.model.js';
import { Movimiento } from '../models/movimiento.model.js';
import { idUsuario } from '../middleware/auth.middleware.js';

/** Detecta el error de índice único de MongoDB. */
const esNombreDuplicado = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === 11000;

// GET: listar todos los gastos fijos del usuario
export const getGastosFijos = async (req: Request, res: Response): Promise<void> => {
  try {
    const gastosFijos = await GastoFijo.find({ usuario: idUsuario(req) }).sort({
      dia: 1,
      descripcion: 1,
    });
    res.status(200).json(gastosFijos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar los gastos fijos' });
  }
};

// GET: obtener un gasto fijo del usuario por su ID
export const getGastoFijoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const gastoFijo = await GastoFijo.findOne({
      _id: req.params['id'],
      usuario: idUsuario(req),
    });

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
    const gastoFijo = await GastoFijo.create({
      ...req.body,
      usuario: idUsuario(req),
    });

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

// PUT: modificar un gasto fijo del usuario
export const updateGastoFijo = async (req: Request, res: Response): Promise<void> => {
  try {
    const gastoFijo = await GastoFijo.findOneAndUpdate(
      { _id: req.params['id'], usuario: idUsuario(req) },
      { ...req.body, usuario: idUsuario(req) },
      {
        new: true,
        runValidators: true,
      }
    );

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

// DELETE: eliminar un gasto fijo del usuario
export const deleteGastoFijo = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = idUsuario(req);
    const gastoFijo = await GastoFijo.findOneAndDelete({
      _id: req.params['id'],
      usuario: usuarioId,
    });

    if (!gastoFijo) {
      res.status(404).json({ mensaje: 'Gasto fijo no encontrado' });
      return;
    }

    // Se eliminan los movimientos que generó este gasto fijo.
    const { deletedCount } = await Movimiento.deleteMany({
      gastoFijoId: String(gastoFijo._id),
      usuario: usuarioId,
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
export const generarMovimientosGastosFijos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const resultado = await generarGastosFijosDelMes(new Date(), idUsuario(req));

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
 * ajustado al último día del mes cuando el mes es más corto.
 *
 * Sin `usuarioId` recorre los gastos fijos de todos los usuarios (lo usa el
 * planificador); con `usuarioId` solo los de ese usuario.
 */
export const generarGastosFijosDelMes = async (
  referencia: Date,
  usuarioId?: string
): Promise<{ generados: number; movimientos: unknown[] }> => {
  const filtro: Record<string, unknown> = { activo: true };

  if (usuarioId) {
    filtro['usuario'] = usuarioId;
  }

  const gastosFijos = await GastoFijo.find(filtro);
  const movimientos: unknown[] = [];

  if (gastosFijos.length === 0) {
    return { generados: 0, movimientos };
  }

  const year = referencia.getFullYear();
  const mes = String(referencia.getMonth() + 1).padStart(2, '0');
  const prefijoMes = `${year}-${mes}`;

  for (const gastoFijo of gastosFijos) {
    // Solo se crea si el gasto fijo no tiene ya un movimiento este mes.
    const existente = await buscarMovimientoDelMes(
      gastoFijo,
      prefijoMes,
      fechaDelGastoFijo(gastoFijo, referencia)
    );

    if (existente) {
      continue;
    }

    const movimiento = await crearMovimientoDesdeGastoFijo(gastoFijo, referencia);
    movimientos.push(movimiento);
  }

  return { generados: movimientos.length, movimientos };
};

/**
 * Fecha del movimiento de un gasto fijo en el mes de referencia.
 * El día se ajusta al último día del mes cuando el mes es más corto.
 */
const fechaDelGastoFijo = (gastoFijo: IGastoFijo, referencia: Date): string => {
  const year = referencia.getFullYear();
  const mes = String(referencia.getMonth() + 1).padStart(2, '0');
  const ultimoDia = new Date(year, referencia.getMonth() + 1, 0).getDate();
  const dia = Math.min(gastoFijo.dia, ultimoDia);
  return `${year}-${mes}-${String(dia).padStart(2, '0')}`;
};

/**
 * Busca el movimiento del mes que corresponde a un gasto fijo.
 *
 * Primero busca el que tiene su `gastoFijoId`. Si no existe (movimientos
 * que se crearon a mano antes de que el gasto fijo tuviera cuenta), busca uno
 * equivalente (misma descripción, fecha e importe) y lo adopta en lugar de
 * crear un duplicado.
 */
const buscarMovimientoDelMes = async (
  gastoFijo: IGastoFijo,
  prefijoMes: string,
  fecha: string
) => {
  const porId = await Movimiento.findOne({
    usuario: gastoFijo.usuario,
    gastoFijoId: String(gastoFijo._id),
    fecha: { $regex: `^${prefijoMes}` },
  });

  if (porId) {
    return porId;
  }

  // Movimiento equivalente creado a mano: se queda enlazado al gasto fijo.
  const equivalente = await Movimiento.findOne({
    usuario: gastoFijo.usuario,
    gastoFijoId: '',
    descripcion: gastoFijo.descripcion,
    fecha,
    gasto: gastoFijo.importe,
  });

  if (equivalente) {
    equivalente.gastoFijoId = String(gastoFijo._id);
    await equivalente.save();
  }

  return equivalente;
};

/**
 * Crea el movimiento de un gasto fijo para el mes indicado.
 * El día se ajusta al último día del mes cuando el mes es más corto.
 */
const crearMovimientoDesdeGastoFijo = async (
  gastoFijo: IGastoFijo,
  referencia: Date
) => {
  const fecha = fechaDelGastoFijo(gastoFijo, referencia);

  return Movimiento.create({
    usuario: gastoFijo.usuario,
    fecha,
    descripcion: gastoFijo.descripcion,
    categoria: gastoFijo.categoria,
    // El movimiento se imputa a la cuenta de "Mis bancos" del gasto fijo
    // (por ejemplo la cuenta del préstamo).
    tipoAhorro: gastoFijo.tipoAhorro ?? '',
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
  const fecha = fechaDelGastoFijo(gastoFijo, referencia);

  const existente = await buscarMovimientoDelMes(gastoFijo, prefijoMes, fecha);

  if (existente) {
    // Si el gasto fijo se ha desactivado, se borra su movimiento del mes.
    if (!gastoFijo.activo) {
      await Movimiento.deleteOne({
        _id: existente._id,
        usuario: gastoFijo.usuario,
      });
      return;
    }

    existente.fecha = fecha;
    existente.descripcion = gastoFijo.descripcion;
    existente.categoria = gastoFijo.categoria;
    existente.tipoAhorro = gastoFijo.tipoAhorro ?? '';
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
