import { Router } from 'express';
import {
  getGastosFijos,
  getGastoFijoById,
  createGastoFijo,
  updateGastoFijo,
  deleteGastoFijo,
  generarMovimientosGastosFijos,
} from '../controllers/gastos-fijos.controller.js';

const router = Router();

router.get('/', getGastosFijos);
router.get('/:id', getGastoFijoById);
router.post('/', createGastoFijo);
router.post('/generar', generarMovimientosGastosFijos);
router.put('/:id', updateGastoFijo);
router.delete('/:id', deleteGastoFijo);

export default router;
