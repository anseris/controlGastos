import { Router } from 'express';
import { Movimiento } from '../models/movimiento.model.js';

const router = Router();

// GET: consultar todos los movimientos
router.get('/', async (_req, res) => {
  try {
    const movimientos = await Movimiento.find().sort({ fecha: -1 });
    res.json(movimientos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar movimientos' });
  }
});

// GET: consultar un movimiento por su ID
router.get('/:id', async (req, res) => {
  try {
    const movimiento = await Movimiento.findById(req.params['id']);

    if (!movimiento) {
      res.status(404).json({ mensaje: 'Movimiento no encontrado' });
      return;
    }

    res.json(movimiento);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'ID de movimiento no válido' });
  }
});

// POST: crear un movimiento
router.post('/', async (req, res) => {
  try {
    const movimiento = await Movimiento.create(req.body);
    res.status(201).json(movimiento);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo crear el movimiento' });
  }
});

// PUT: modificar un movimiento
router.put('/:id', async (req, res) => {
  try {
    const movimiento = await Movimiento.findByIdAndUpdate(
      req.params['id'],
      req.body,
      { new: true, runValidators: true }
    );

    if (!movimiento) {
      res.status(404).json({ mensaje: 'Movimiento no encontrado' });
      return;
    }

    res.json(movimiento);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo modificar el movimiento' });
  }
});

// DELETE: eliminar un movimiento
router.delete('/:id', async (req, res) => {
  try {
    const movimiento = await Movimiento.findByIdAndDelete(req.params['id']);

    if (!movimiento) {
      res.status(404).json({ mensaje: 'Movimiento no encontrado' });
      return;
    }

    res.json({ mensaje: 'Movimiento eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo eliminar el movimiento' });
  }
});

export default router;