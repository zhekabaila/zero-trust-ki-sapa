// Kebutuhan 4.1: endpoint auth (/auth/login|refresh|logout|service).
// express.json() DIPASANG DI SINI SAJA — kalau dipasang global, body request terlanjur dibaca
// dan proxy akan menggantung (catatan di ARCHITECTURE §3).
import express, { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import * as authController from '../controllers/auth.controller.js';
import { loginSchema, refreshSchema, logoutSchema, serviceSchema } from '../validators/auth.validator.js';

const router = Router();
router.use(express.json({ limit: '16kb' }));

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(logoutSchema), authController.logout);
router.post('/service', validate(serviceSchema), authController.service);

export default router;
