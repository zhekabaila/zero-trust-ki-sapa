// Peta URL kelas: hanya finalisasi yang boleh (Tabel 3).
import { Router } from 'express';
import { requireRole } from '../middlewares/require-role.middleware.js';
import * as kelasController from '../controllers/kelas.controller.js';

const router = Router();

router.post('/:id/finalisasi', requireRole('DOSEN'), kelasController.finalisasi);

export default router;
