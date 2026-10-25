import { Categoria } from '../models/categoria.model.js';

/**
 * Categorías que se crean automáticamente al registrarse.
 *
 * Son las mismas que tenía la aplicación antes de separar los datos por
 * usuario, para que una cuenta nueva sea utilizable desde el primer momento.
 */
export const CATEGORIAS_POR_DEFECTO = [
  {
    nombre: 'Ahorro',
    tipo: 'gasto',
    icono: 'pi pi-euro',
    color: '#14B8A6',
    hasIcono: true,
    primeraLetra: 'A',
  },
  {
    nombre: 'Caprichos',
    tipo: 'gasto',
    icono: 'pi pi-gift',
    color: '#1F2937',
    hasIcono: true,
    primeraLetra: 'C',
  },
  {
    nombre: 'Casa',
    tipo: 'gasto',
    icono: 'pi pi-home',
    color: '#EC4899',
    hasIcono: true,
    primeraLetra: 'C',
  },
  {
    nombre: 'Coche',
    tipo: 'gasto',
    icono: 'pi pi-car',
    color: '#143d7e',
    hasIcono: true,
    primeraLetra: 'C',
  },
  {
    nombre: 'Comida',
    tipo: 'gasto',
    icono: 'pi pi-shopping-cart',
    color: '#8B5CF6',
    hasIcono: true,
    primeraLetra: 'C',
  },
  {
    nombre: 'Imprevistos',
    tipo: 'gasto',
    icono: 'pi pi-exclamation-triangle',
    color: '#EAB308',
    hasIcono: true,
    primeraLetra: 'I',
  },
  {
    nombre: 'Ocio',
    tipo: 'gasto',
    icono: 'pi pi-ticket',
    color: '#EF4444',
    hasIcono: true,
    primeraLetra: 'O',
  },
  {
    nombre: 'Otros Ingresos',
    tipo: 'ingreso',
    icono: '',
    color: '#3B82F6',
    hasIcono: false,
    primeraLetra: 'O',
  },
  {
    nombre: 'Otros gastos',
    tipo: 'gasto',
    icono: 'pi pi-sync',
    color: '#6B7280',
    hasIcono: true,
    primeraLetra: 'O',
  },
  {
    nombre: 'Subscripciones',
    tipo: 'gasto',
    icono: 'pi pi-globe',
    color: '#F97316',
    hasIcono: true,
    primeraLetra: 'S',
  },
  {
    nombre: 'Sueldo',
    tipo: 'ingreso',
    icono: 'pi pi-money-bill',
    color: '#22C55E',
    hasIcono: true,
    primeraLetra: 'S',
  },
  {
    nombre: 'Tabaco',
    tipo: 'gasto',
    icono: 'pi pi-times',
    color: '#A16207',
    hasIcono: true,
    primeraLetra: 'T',
  },
] as const;

/** Crea las categorías base de un usuario si todavía no tiene ninguna. */
export async function crearCategoriasPorDefecto(usuarioId: string): Promise<void> {
  const existe = await Categoria.exists({ usuario: usuarioId });

  if (existe) {
    return;
  }

  await Categoria.insertMany(
    CATEGORIAS_POR_DEFECTO.map((categoria) => ({
      ...categoria,
      usuario: usuarioId,
    }))
  );
}
