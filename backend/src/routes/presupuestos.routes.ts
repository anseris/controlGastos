import { Router } from 'express';
import {
  getPresupuestos,
  updatePresupuesto,
  updateDiaTransferencia,
} from '../controllers/presupuestos.controller.js';

const router = Router();

router.get('/', getPresupuestos);
// Esta ruta debe declararse antes que `/:clave` para que no la capture.
router.put('/dia-transferencia', updateDiaTransferencia);
router.put('/:clave', updatePresupuesto);

export default router;
