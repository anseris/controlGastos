import { Router } from 'express';
import { Movimiento } from '../models/movimiento.model.js';
import { idUsuario } from '../middleware/auth.middleware.js';

const router = Router();

// GET: consultar los movimientos del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const movimientos = await Movimiento.find({ usuario: idUsuario(req) }).sort({ fecha: -1 });
    res.json(movimientos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar movimientos' });
  }
});

// GET: consultar un movimiento del usuario por su ID
router.get('/:id', async (req, res) => {
  try {
    const movimiento = await Movimiento.findOne({
      _id: req.params['id'],
      usuario: idUsuario(req),
    });

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

// POST: crear un movimiento para el usuario autenticado
router.post('/', async (req, res) => {
  try {
    const movimiento = await Movimiento.create({
      ...req.body,
      usuario: idUsuario(req),
    });
    res.status(201).json(movimiento);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: 'No se pudo crear el movimiento' });
  }
});

// PUT: modificar un movimiento del usuario
router.put('/:id', async (req, res) => {
  try {
    const movimiento = await Movimiento.findOneAndUpdate(
      { _id: req.params['id'], usuario: idUsuario(req) },
      { ...req.body, usuario: idUsuario(req) },
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

// DELETE: eliminar un movimiento del usuario
router.delete('/:id', async (req, res) => {
  try {
    const movimiento = await Movimiento.findOneAndDelete({
      _id: req.params['id'],
      usuario: idUsuario(req),
    });

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
