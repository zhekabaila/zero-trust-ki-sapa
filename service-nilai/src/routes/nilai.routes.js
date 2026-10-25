// Peta URL nilai → middleware → controller. Secret & token sudah diverifikasi di app.js.
import { Router } from 'express';
import { requireRole } from '../middlewares/require-role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateNilaiSchema } from '../validators/nilai.validator.js';
import * as nilaiController from '../controllers/nilai.controller.js';

const router = Router();

router.get('/', requireRole('MAHASISWA', 'DOSEN'), nilaiController.list);
router.put('/:id', requireRole('DOSEN'), validate(updateNilaiSchema), nilaiController.update);

export default router;
