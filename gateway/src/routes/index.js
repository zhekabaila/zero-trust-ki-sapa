// Perangkai route gateway: /auth/* ditangani lokal, sisanya dijaga policy lalu diteruskan.
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import guardedRoutes from './guarded.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use(guardedRoutes);

export default router;
