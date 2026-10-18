import type { Request, Response } from 'express';

export const getMovimientos = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: 'Listar movimientos' });
};

export const getMovimientoById = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: `Movimiento ${req.params.id}` });
};

export const createMovimiento = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json({ message: 'Movimiento creado', body: req.body });
};

export const updateMovimiento = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: `Movimiento ${req.params.id} actualizado`, body: req.body });
};

export const deleteMovimiento = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: `Movimiento ${req.params.id} eliminado` });
};
