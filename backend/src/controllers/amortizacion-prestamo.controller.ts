import type { Request, Response } from 'express';
import {
  AmortizacionCuota,
  PrestamoCuadro,
} from '../models/amortizacion-prestamo.model.js';
import {
  buscarArchivoCuadro,
  importarCuadro,
  sincronizarGastoFijoCuota,
} from '../services/amortizacion-prestamo.service.js';
import { idUsuario } from '../middleware/auth.middleware.js';

/** GET: devuelve la cabecera y las cuotas del cuadro de amortización. */
export const getCuadro = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = idUsuario(req);
    const [datos, cuotas] = await Promise.all([
      PrestamoCuadro.findOne({ usuario: usuarioId }).sort({ createdAt: -1 }),
      AmortizacionCuota.find({ usuario: usuarioId }).sort({ mes: 1 }),
    ]);

    res.status(200).json({
      datos: datos ?? null,
      cuotas,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar el cuadro de amortización' });
  }
};

/**
 * POST: importa el cuadro de amortización en la BBDD.
 *
 * - Sin cuerpo: usa el archivo `CuadroDeAmortizacion.XLS` del proyecto.
 * - Con `{ contenidoBase64 }`: usa el archivo que sube el navegador
 *   (así también funciona cuando el backend está desplegado sin el Excel).
 */
export const importarCuadroAmortizacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const contenidoBase64 = (req.body?.contenidoBase64 ?? '') as string;

    let contenido: Buffer | undefined;
    if (contenidoBase64) {
      // Puede venir con o sin el prefijo data:...;base64
      const base64 = contenidoBase64.includes(',')
        ? contenidoBase64.slice(contenidoBase64.indexOf(',') + 1)
        : contenidoBase64;
      contenido = Buffer.from(base64, 'base64');
    }

    const resultado = await importarCuadro(idUsuario(req), contenido);

    res.status(200).json({
      mensaje: resultado.mensaje,
      datos: resultado.datos,
      cuotas: resultado.cuotas,
    });
  } catch (error) {
    console.error(error);
    const mensaje =
      error instanceof Error ? error.message : 'Error al importar el cuadro de amortización';
    res.status(400).json({ mensaje });
  }
};

/** POST: sincroniza el importe del gasto fijo de la cuota con el cuadro. */
export const sincronizarCuota = async (req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await sincronizarGastoFijoCuota(idUsuario(req));

    res.status(200).json({
      mensaje: resultado.mensaje,
      sincronizados: resultado.sincronizados,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al sincronizar la cuota del préstamo' });
  }
};

/** GET: indica si el archivo del proyecto está disponible en el servidor. */
export const getArchivoProyecto = async (_req: Request, res: Response): Promise<void> => {
  try {
    const ruta = buscarArchivoCuadro();

    res.status(200).json({
      disponible: !!ruta,
      ruta: ruta ?? '',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al buscar el archivo del proyecto' });
  }
};
