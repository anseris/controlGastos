import { Usuario } from '../models/usuario.model.js';
import { Movimiento } from '../models/movimiento.model.js';
import { Categoria } from '../models/categoria.model.js';
import { CuentaBanco } from '../models/cuenta-banco.model.js';
import { Presupuesto } from '../models/presupuesto.model.js';
import { GastoFijo } from '../models/gasto-fijo.model.js';
import {
  AmortizacionCuota,
  PrestamoCuadro,
} from '../models/amortizacion-prestamo.model.js';
import { crearCategoriasPorDefecto } from './datos-iniciales.service.js';

/**
 * Documentos creados antes de que existiera el login: no tienen dueño.
 * Se asignan al usuario más antiguo (la cuenta original) para no perderlos.
 */
const filtroSinUsuario = {
  $or: [
    { usuario: { $exists: false } },
    { usuario: null },
    { usuario: '' },
  ],
};

/** Asigna todos los documentos antiguos sin dueño al usuario indicado. */
export async function reclamarDatosHuerfanos(usuarioId: string): Promise<void> {
  const cambios = { $set: { usuario: usuarioId } };

  await Promise.all([
    Movimiento.updateMany(filtroSinUsuario, cambios),
    Categoria.updateMany(filtroSinUsuario, cambios),
    CuentaBanco.updateMany(filtroSinUsuario, cambios),
    Presupuesto.updateMany(filtroSinUsuario, cambios),
    GastoFijo.updateMany(filtroSinUsuario, cambios),
    AmortizacionCuota.updateMany(filtroSinUsuario, cambios),
    PrestamoCuadro.updateMany(filtroSinUsuario, cambios),
  ]);
}

/**
 * Sincroniza los índices de un modelo tolerando el error de "índice no
 * encontrado" que puede producirse si dos procesos arrancan a la vez
 * (por ejemplo, con el recargado automático de desarrollo).
 */
async function sincronizarModelo(
  modelo: { syncIndexes: () => Promise<string[]> },
  nombre: string
): Promise<void> {
  try {
    await modelo.syncIndexes();
  } catch (error) {
    const codigo = (error as { code?: number }).code;

    if (codigo !== 27) {
      throw error;
    }

    console.warn(`[migración] Los índices de ${nombre} ya estaban actualizados.`);
  }
}

/**
 * Recrea los índices de las colecciones.
 *
 * Antes `categoria.nombre`, `cuenta.clave` y `presupuesto.clave` eran únicos
 * a nivel global. Ahora deben ser únicos por usuario, así que hay que eliminar
 * los índices antiguos (Mongoose lo hace con `syncIndexes`).
 */
async function sincronizarIndices(): Promise<void> {
  await Promise.all([
    sincronizarModelo(Movimiento, 'movimientos'),
    sincronizarModelo(Categoria, 'categorias'),
    sincronizarModelo(CuentaBanco, 'cuentas-banco'),
    sincronizarModelo(Presupuesto, 'presupuestos'),
    sincronizarModelo(GastoFijo, 'gastos_fijos'),
    sincronizarModelo(AmortizacionCuota, 'amortizacion_prestamo'),
    sincronizarModelo(PrestamoCuadro, 'prestamo_cuadro'),
  ]);
}

/**
 * Migración que se ejecuta al arrancar el servidor:
 * 1. Asigna los datos antiguos al usuario más antiguo.
 * 2. Recrea los índices con el ámbito de usuario.
 * 3. Da categorías base a las cuentas que estén totalmente vacías.
 */
export async function migrarDatosExistentes(): Promise<void> {
  const usuarioPrincipal = await Usuario.findOne()
    .sort({ createdAt: 1, _id: 1 })
    .select('_id');

  if (usuarioPrincipal) {
    await reclamarDatosHuerfanos(String(usuarioPrincipal._id));
  }

  await sincronizarIndices();

  const usuarios = await Usuario.find().select('_id');

  for (const usuario of usuarios) {
    const usuarioId = String(usuario._id);

    const [categorias, movimientos, gastosFijos] = await Promise.all([
      Categoria.exists({ usuario: usuarioId }),
      Movimiento.exists({ usuario: usuarioId }),
      GastoFijo.exists({ usuario: usuarioId }),
    ]);

    if (!categorias && !movimientos && !gastosFijos) {
      await crearCategoriasPorDefecto(usuarioId);
    }
  }
}
