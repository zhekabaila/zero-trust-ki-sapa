// Kebutuhan 4.2: pipeline request terproteksi (ARCHITECTURE §3):
// authenticate → enforce-policy → proxy. Router ini dipasang TANPA prefix,
// sehingga req.url tetap utuh saat diteruskan ke service (menghindari jebakan Express memotong prefix).
import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { enforcePolicy } from '../middlewares/enforce-policy.middleware.js';
import { createServiceProxy } from '../proxy/service-proxy.js';
import { env } from '../config/env.js';

const router = Router();
const nilaiProxy = createServiceProxy(env.nilaiUrl);
const transkripProxy = createServiceProxy(env.transkripUrl);

// Hanya route di Tabel 3 soal yang didaftarkan; yang lain jatuh ke default deny.
router.get('/nilai', authenticate, enforcePolicy('nilai.list'), nilaiProxy);
router.put('/nilai/:id', authenticate, enforcePolicy('nilai.update'), nilaiProxy);
router.post('/kelas/:id/finalisasi', authenticate, enforcePolicy('kelas.finalisasi'), nilaiProxy);
router.get('/transkrip/:nim', authenticate, enforcePolicy('transkrip.get'), transkripProxy);
router.post('/transkrip/sinkron', authenticate, enforcePolicy('transkrip.sinkron'), transkripProxy);

export default router;
