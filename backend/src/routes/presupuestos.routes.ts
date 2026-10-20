import { Router } from 'express';
import {
  getPresupuestos,
  updatePresupuesto,
} from '../controllers/presupuestos.controller.js';

const router = Router();

router.get('/', getPresupuestos);
router.put('/:clave', updatePresupuesto);

export default router;
