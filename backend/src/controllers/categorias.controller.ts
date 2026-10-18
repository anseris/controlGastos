import type { Request, Response } from 'express';

export const getCategorias = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: 'Listar categorías' });
};

export const getCategoriaById = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: `Categoría ${req.params.id}` });
};

export const createCategoria = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json({ message: 'Categoría creada', body: req.body });
};

export const updateCategoria = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: `Categoría ${req.params.id} actualizada`, body: req.body });
};

export const deleteCategoria = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: `Categoría ${req.params.id} eliminada` });
};
