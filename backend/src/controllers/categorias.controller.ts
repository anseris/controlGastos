import type { Request, Response } from 'express';
import { Categoria } from '../models/categoria.model.js';
import { idUsuario } from '../middleware/auth.middleware.js';

/** Detecta el error de índice único de MongoDB (nombre duplicado). */
const esNombreDuplicado = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === 11000;

// GET: listar todas las categorías del usuario
export const getCategorias = async (req: Request, res: Response): Promise<void> => {
  try {
    const categorias = await Categoria.find({ usuario: idUsuario(req) }).sort({ nombre: 1 });
    res.status(200).json(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar las categorías' });
  }
};

// GET: obtener una categoría por su ID
export const getCategoriaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoria = await Categoria.findOne({
      _id: req.params['id'],
      usuario: idUsuario(req),
    });

    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    res.status(200).json(categoria);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'ID de categoría no válido' });
  }
};

// POST: crear una categoría
export const createCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoria = await Categoria.create({
      ...req.body,
      usuario: idUsuario(req),
    });
    res.status(201).json(categoria);
  } catch (error) {
    if (esNombreDuplicado(error)) {
      res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
      return;
    }
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo crear la categoría' });
  }
};

// PUT: modificar una categoría
export const updateCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoria = await Categoria.findOneAndUpdate(
      { _id: req.params['id'], usuario: idUsuario(req) },
      { ...req.body, usuario: idUsuario(req) },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    res.status(200).json(categoria);
  } catch (error) {
    if (esNombreDuplicado(error)) {
      res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
      return;
    }
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo modificar la categoría' });
  }
};

// DELETE: eliminar una categoría
export const deleteCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoria = await Categoria.findOneAndDelete({
      _id: req.params['id'],
      usuario: idUsuario(req),
    });

    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    res.status(200).json({ mensaje: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo eliminar la categoría' });
  }
};
