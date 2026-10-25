// Perakitan Service Nilai. Urutan pertahanan (POLICY §5): secret → token → role → controller.
import express from 'express';
import { verifyGatewaySecret } from './middlewares/verify-gateway-secret.middleware.js';
import { verifyToken } from './middlewares/verify-token.middleware.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { fail } from './lib/response.js';
import nilaiRoutes from './routes/nilai.routes.js';
import kelasRoutes from './routes/kelas.routes.js';

const app = express();
app.disable('x-powered-by');

// /health tanpa secret agar healthcheck Docker jalan (API.md §7).
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Body parser aman di SINI (service tujuan akhir): gateway meneruskan body mentah lewat proxy,
// Service Nilai yang memakainya (PUT /nilai/:id kirim {"score":...}). Jauh berbeda dari gateway
// yang TIDAK memasang json() global agar proxy tidak menggantung (ARCHITECTURE §3).
app.use(express.json({ limit: '16kb' }));

app.use(verifyGatewaySecret);
app.use(verifyToken('access')); // endpoint Service Nilai selalu memakai token user

app.use('/nilai', nilaiRoutes);
app.use('/kelas', kelasRoutes);

// Route lain di luar Tabel 3: dilayani gateway, jadi di sini cukup 404 generik.
app.use((req, res) => res.status(404).json(fail('NOT_FOUND', 'Endpoint tidak ada di service ini')));
app.use(errorHandler);

export default app;
