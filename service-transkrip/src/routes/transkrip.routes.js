// Peta URL transkrip. Type token berbeda per endpoint, jadi verifyToken dipasang per route:
// - GET /:nim        → token user (access)
// - POST /sinkron    → token service saja (kebutuhan 4.1 & T24)
import { Router } from 'express';
import { verifyToken } from '../middlewares/verify-token.middleware.js';
import { requireRole } from '../middlewares/require-role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { sinkronSchema } from '../validators/transkrip.validator.js';
import * as transkripController from '../controllers/transkrip.controller.js';

const router = Router();

// /sinkron didaftarkan lebih dulu agar ':nim' tidak pernah menelan kata 'sinkron'.
router.post('/sinkron', verifyToken('service'), requireRole('service'), validate(sinkronSchema), transkripController.sinkron);
router.get('/:nim', verifyToken('access'), requireRole('MAHASISWA', 'ADMIN'), transkripController.get);

export default router;
