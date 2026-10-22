import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import {
  AmortizacionCuota,
  PrestamoCuadro,
  type IAmortizacionCuota,
  type IPrestamoCuadro,
} from '../models/amortizacion-prestamo.model.js';
import { GastoFijo } from '../models/gasto-fijo.model.js';
import { sincronizarMovimientoDelMes } from '../controllers/gastos-fijos.controller.js';

/** Nombre del archivo Excel con el cuadro de amortización. */
export const NOMBRE_ARCHIVO_CUADRO = 'CuadroDeAmortizacion.XLS';

/** Cuota importada (sin `_id`). */
type CuotaImportada = Omit<IAmortizacionCuota, '_id'>;

/** Cabecera importada (sin `_id`). */
type CuadroImportado = Omit<IPrestamoCuadro, '_id'>;

/** Normaliza un texto: minúsculas, sin acentos y con espacios colapsados. */
const normalizar = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Convierte un valor del Excel (formato español) en número. */
const aNumero = (valor: unknown): number => {
  if (typeof valor === 'number' && isFinite(valor)) {
    return valor;
  }

  const texto = String(valor ?? '').replace(/[^\d,.\-]/g, '').trim();
  if (!texto) {
    return 0;
  }

  let normalizado: string;
  if (texto.includes(',')) {
    // Formato español: 1.637,69 -> 1637.69
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{3}$/.test(texto)) {
    // Separador de miles: 26.000 -> 26000
    normalizado = texto.replace(/\./g, '');
  } else {
    normalizado = texto.replace(/,/g, '.');
  }

  const numero = parseFloat(normalizado);
  return isNaN(numero) ? 0 : numero;
};

/** Convierte una fecha del Excel (dd/mm/aaaa) en `aaaa-mm-dd`. */
const aFecha = (valor: unknown): string => {
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  const texto = String(valor ?? '').trim();
  const diaMesAno = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (diaMesAno) {
    return `${diaMesAno[3]}-${diaMesAno[2]}-${diaMesAno[1]}`;
  }

  const anoMesDia = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (anoMesDia) {
    return `${anoMesDia[1]}-${anoMesDia[2]}-${anoMesDia[3]}`;
  }

  return '';
};

/**
 * Devuelve el primer valor no vacío de la fila a partir de la columna indicada.
 * `columnaFinal` acota la búsqueda para que un dato vacío no se confunda con
 * el de la columna siguiente (las cabeceras del Excel van fusionadas).
 */
const valorEnRango = (
  fila: unknown[],
  columna: number,
  columnaFinal: number
): unknown => {
  for (let i = Math.max(0, columna); i < Math.min(fila.length, columnaFinal); i++) {
    const valor = fila[i];
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
      return valor;
    }
  }
  return '';
};

/** Etiquetas de la cabecera del cuadro y su columna. */
const ETIQUETAS_CUADRO: { clave: keyof CuotaImportada; textos: string[] }[] = [
  { clave: 'mes', textos: ['mes'] },
  { clave: 'fecha', textos: ['fecha'] },
  { clave: 'amortizacionCapital', textos: ['amortizacion capital'] },
  { clave: 'interesPagado', textos: ['interes pagado'] },
  { clave: 'cuota', textos: ['cuota'] },
  { clave: 'capitalPendiente', textos: ['capital pendiente'] },
];

/**
 * Localiza la fila de cabecera del cuadro (la que contiene los rótulos de las
 * columnas) y devuelve la columna de cada dato.
 */
const localizarCabecera = (
  filas: unknown[][]
): { indice: number; columnas: Partial<Record<keyof CuotaImportada, number>> } | null => {
  for (let indice = 0; indice < filas.length; indice++) {
    const fila = filas[indice];
    const textos = fila.map((celda) => normalizar(celda));

    const tieneAmortizacion = textos.some((texto) =>
      texto.startsWith('amortizacion capital')
    );
    const tieneCuota = textos.some((texto) => texto.startsWith('cuota'));
    const tieneFecha = textos.some((texto) => texto.startsWith('fecha'));

    if (!tieneAmortizacion || !tieneCuota || !tieneFecha) {
      continue;
    }

    const columnas: Partial<Record<keyof CuotaImportada, number>> = {};
    ETIQUETAS_CUADRO.forEach(({ clave, textos: etiquetas }) => {
      const columna = textos.findIndex((texto) =>
        etiquetas.some((etiqueta) => texto.startsWith(etiqueta))
      );
      if (columna >= 0) {
        columnas[clave] = columna;
      }
    });

    if (columnas.cuota === undefined || columnas.fecha === undefined) {
      continue;
    }

    return { indice, columnas };
  }

  return null;
};

/**
 * Busca un texto suelto en las primeras filas del Excel (título del préstamo,
 * número de cuenta, titular...).
 */
const buscarTexto = (filas: unknown[][], patron: RegExp): string => {
  for (const fila of filas) {
    for (const celda of fila) {
      const texto = String(celda ?? '').trim();
      if (patron.test(texto)) {
        return texto;
      }
    }
  }
  return '';
};

/** Texto que hay detrás de los dos puntos de una etiqueta ('Periodo: ...'). */
const textoTrasDosPuntos = (texto: string): string => {
  const indice = texto.indexOf(':');
  return indice >= 0 ? texto.slice(indice + 1).trim() : texto.trim();
};

/**
 * Busca una etiqueta suelta en la cabecera del Excel ("Capital inicial",
 * "Fecha firma"...) y devuelve el valor que tiene en las filas siguientes.
 */
const valorDeEtiqueta = (
  filas: unknown[][],
  etiqueta: string,
  maximoFilas = 4
): unknown => {
  for (let indice = 0; indice < filas.length; indice++) {
    const fila = filas[indice];
    const columna = fila.findIndex((celda) => normalizar(celda).startsWith(etiqueta));
    if (columna < 0) {
      continue;
    }

    for (let filaIndice = indice + 1; filaIndice < Math.min(filas.length, indice + maximoFilas); filaIndice++) {
      const valor = valorEnRango(filas[filaIndice], columna, filas[filaIndice].length);
      if (valor !== '') {
        return valor;
      }
    }
  }

  return '';
};

/**
 * Lee el Excel del cuadro de amortización y devuelve la cabecera y las cuotas.
 */
export const parseCuadro = (contenido: Buffer): {
  datos: CuadroImportado;
  cuotas: CuotaImportada[];
} => {
  const libro = XLSX.read(contenido, { type: 'buffer' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' }) as unknown[][];

  const cabecera = localizarCabecera(filas);
  if (!cabecera) {
    throw new Error('No se ha encontrado la tabla de amortización en el archivo Excel.');
  }

  // Columnas ordenadas: cada dato se busca entre su columna y la siguiente.
  const columnasOrdenadas = Object.entries(cabecera.columnas)
    .map(([clave, columna]) => ({ clave: clave as keyof CuotaImportada, columna: columna as number }))
    .sort((a, b) => a.columna - b.columna);

  const cuotas: CuotaImportada[] = [];

  for (let indice = cabecera.indice + 1; indice < filas.length; indice++) {
    const fila = filas[indice];

    const valores = {} as Record<string, unknown>;
    columnasOrdenadas.forEach(({ clave, columna }, posicion) => {
      const siguiente = columnasOrdenadas[posicion + 1]?.columna ?? fila.length;
      valores[clave] = valorEnRango(fila, columna, siguiente);
    });

    const fecha = aFecha(valores['fecha']);
    const cuota = aNumero(valores['cuota']);

    if (!fecha || cuota <= 0) {
      continue;
    }

    cuotas.push({
      mes: aNumero(valores['mes']),
      fecha,
      amortizacionCapital: aNumero(valores['amortizacionCapital']),
      interesPagado: aNumero(valores['interesPagado']),
      cuota,
      capitalPendiente: aNumero(valores['capitalPendiente']),
    });
  }

  if (cuotas.length === 0) {
    throw new Error('El archivo Excel no contiene cuotas de amortización.');
  }

  const textoPrestamo = buscarTexto(filas, /^pr[eé]stamo\s/i);
  const textoCuenta = buscarTexto(filas, /cuenta de pr[eé]stamo/i);
  const textoTitular = buscarTexto(filas, /^sr\.?\/?sra\.?/i);
  const textoPeriodo = buscarTexto(filas, /^periodo/i);

  const capitalInicial = aNumero(valorDeEtiqueta(filas, 'capital inicial'));
  const capitalPendienteInicial = aNumero(valorDeEtiqueta(filas, 'capital pendiente'));

  const datos: CuadroImportado = {
    descripcion: textoPrestamo || 'Préstamo',
    cuenta: textoCuenta ? textoTrasDosPuntos(textoCuenta) : '',
    titular: textoTitular ? textoTrasDosPuntos(textoTitular) : '',
    periodo: textoPeriodo ? textoTrasDosPuntos(textoPeriodo) : '',
    capitalInicial,
    capitalPendienteInicial,
    fechaFirma: aFecha(valorDeEtiqueta(filas, 'fecha firma')),
    fechaFin: aFecha(valorDeEtiqueta(filas, 'fecha fin')),
    importadoEn: new Date().toISOString().slice(0, 10),
  };

  return { datos, cuotas };
};

/**
 * Busca el archivo `CuadroDeAmortizacion.XLS` en el proyecto.
 * Se prueban varias rutas porque el backend puede arrancar desde la raíz
 * del repositorio o desde la carpeta `backend`.
 */
export const buscarArchivoCuadro = (): string | null => {
  const raizProyecto = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const candidatas = [
    join(process.cwd(), NOMBRE_ARCHIVO_CUADRO),
    join(process.cwd(), '..', NOMBRE_ARCHIVO_CUADRO),
    join(raizProyecto, NOMBRE_ARCHIVO_CUADRO),
    join(raizProyecto, '..', NOMBRE_ARCHIVO_CUADRO),
  ];

  for (const ruta of candidatas) {
    try {
      if (existsSync(ruta)) {
        return ruta;
      }
    } catch {
      // se ignora y se prueba la siguiente ruta
    }
  }

  return null;
};

/**
 * Devuelve la cuota que corresponde a la fecha de referencia:
 * la del mes actual si existe, si no la primera que está por llegar.
 */
export const cuotaParaReferencia = (
  cuotas: { fecha: string; cuota: number }[],
  referencia: Date
): { fecha: string; cuota: number } | null => {
  if (cuotas.length === 0) {
    return null;
  }

  const prefijoMes = `${referencia.getFullYear()}-${String(referencia.getMonth() + 1).padStart(2, '0')}`;
  const delMes = cuotas.find((cuota) => cuota.fecha.startsWith(prefijoMes));
  if (delMes) {
    return delMes;
  }

  const hoy = referencia.toISOString().slice(0, 10);
  const siguiente = cuotas.find((cuota) => cuota.fecha >= hoy);
  return siguiente ?? cuotas[cuotas.length - 1];
};

/**
 * Sincroniza el importe de los gastos fijos marcados como "cuota de préstamo"
 * con la cuota del cuadro de amortización y actualiza su movimiento del mes.
 */
export const sincronizarGastoFijoCuota = async (
  referencia: Date = new Date()
): Promise<{ sincronizados: number; mensaje: string }> => {
  const cuotas = await AmortizacionCuota.find().sort({ mes: 1 });
  const cuota = cuotaParaReferencia(cuotas, referencia);

  if (!cuota) {
    return { sincronizados: 0, mensaje: 'No hay cuadro de amortización importado.' };
  }

  const gastosFijos = await GastoFijo.find({ esCuotaPrestamo: true });

  if (gastosFijos.length === 0) {
    return {
      sincronizados: 0,
      mensaje: 'No hay gastos fijos de cuota de préstamo que sincronizar.',
    };
  }

  let sincronizados = 0;

  for (const gastoFijo of gastosFijos) {
    if (Math.abs(gastoFijo.importe - cuota.cuota) > 0.001) {
      gastoFijo.importe = cuota.cuota;
      await gastoFijo.save();
    }

    // El movimiento del mes se actualiza con el nuevo importe.
    await sincronizarMovimientoDelMes(gastoFijo, referencia);
    sincronizados++;
  }

  return {
    sincronizados,
    mensaje: `Cuota de ${cuota.cuota.toFixed(2)} € aplicada a ${sincronizados} gasto(s) fijo(s).`,
  };
};

/**
 * Importa el cuadro de amortización en la BBDD (reemplaza el contenido
 * anterior) y sincroniza el gasto fijo de la cuota.
 */
export const importarCuadro = async (
  contenido?: Buffer
): Promise<{ datos: CuadroImportado; cuotas: CuotaImportada[]; mensaje: string }> => {
  const buffer = contenido ?? leerArchivoProyecto();

  const { datos, cuotas } = parseCuadro(buffer);

  await AmortizacionCuota.deleteMany({});
  await AmortizacionCuota.insertMany(cuotas);

  await PrestamoCuadro.deleteMany({});
  await PrestamoCuadro.create(datos);

  const sincronizacion = await sincronizarGastoFijoCuota();

  return {
    datos,
    cuotas,
    mensaje:
      `Se han importado ${cuotas.length} cuotas.` +
      (sincronizacion.sincronizados > 0 ? ` ${sincronizacion.mensaje}` : ''),
  };
};

/** Lee el Excel del proyecto (si existe) y devuelve su contenido. */
const leerArchivoProyecto = (): Buffer => {
  const ruta = buscarArchivoCuadro();

  if (!ruta) {
    throw new Error(
      `No se ha encontrado el archivo ${NOMBRE_ARCHIVO_CUADRO} en el proyecto. ` +
        'Sube el archivo desde el navegador o colócalo en la raíz del repositorio.'
    );
  }

  return readFileSync(ruta);
};
