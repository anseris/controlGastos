import { Router } from 'express';
import {
  getArchivoProyecto,
  getCuadro,
  importarCuadroAmortizacion,
  sincronizarCuota,
} from '../controllers/amortizacion-prestamo.controller.js';

const router = Router();

router.get('/', getCuadro);
router.get('/archivo', getArchivoProyecto);
router.post('/importar', importarCuadroAmortizacion);
router.post('/sincronizar', sincronizarCuota);

export default router;
