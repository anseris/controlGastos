import { Router } from 'express';
import {
  getCuentasBanco,
  getCuentaBancoById,
  createCuentaBanco,
  updateCuentaBanco,
  deleteCuentaBanco,
} from '../controllers/cuentas-banco.controller.js';

const router = Router();

router.get('/', getCuentasBanco);
router.get('/:id', getCuentaBancoById);
router.post('/', createCuentaBanco);
router.put('/:id', updateCuentaBanco);
router.delete('/:id', deleteCuentaBanco);

export default router;
