import { generarGastosFijosDelMes } from '../controllers/gastos-fijos.controller.js';

/** Intervalo de comprobación (cada hora). */
const INTERVALO_MS = 60 * 60 * 1000;

/**
 * Comprueba si el mes actual ha cambiado desde la última ejecución.
 * Evita generar los movimientos del mes nuevo varias veces seguidas.
 */
let ultimoMesGenerado = '';

/** Ejecuta la generación de gastos fijos del mes actual (si toca). */
export const ejecutarGeneracionGastosFijos = async (forzar = false): Promise<void> => {
  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

  if (!forzar && mesActual === ultimoMesGenerado) {
    return;
  }

  try {
    const resultado = await generarGastosFijosDelMes(ahora);
    ultimoMesGenerado = mesActual;

    if (resultado.generados > 0) {
      console.log(
        `[gastos-fijos] ${resultado.generados} movimiento(s) generados para ${mesActual}`
      );
    }
  } catch (error) {
    console.error('[gastos-fijos] Error al generar los movimientos del mes:', error);
  }
};

/**
 * Arranca el planificador que genera los movimientos de gastos fijos
 * automáticamente, sin que el usuario tenga que añadirlos cada mes.
 *
 * - Al arrancar el servidor se comprueba el mes actual.
 * - Después, cada hora se vuelve a comprobar (por si el servidor estaba
 *   apagado el día 1 y se ha encendido a mitad de mes).
 */
export const iniciarGeneradorGastosFijos = (): void => {
  void ejecutarGeneracionGastosFijos(true);

  const temporizador = setInterval(() => {
    void ejecutarGeneracionGastosFijos();
  }, INTERVALO_MS);

  // `unref` evita que el temporizador mantenga vivo el proceso al cerrar.
  temporizador.unref?.();
};
