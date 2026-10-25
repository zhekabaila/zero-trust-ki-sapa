// Perakitan Service Transkrip. Secret gateway diverifikasi dulu (POLICY §5), lalu per-route.
import express from 'express';
import { verifyGatewaySecret } from './middlewares/verify-gateway-secret.middleware.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { fail } from './lib/response.js';
import transkripRoutes from './routes/transkrip.routes.js';

const app = express();
app.disable('x-powered-by');

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Body parser aman dipasang di sini: request transkrip berakhir di service ini (tidak diproxy lanjut).
app.use(express.json({ limit: '64kb' }));

app.use(verifyGatewaySecret);
app.use('/transkrip', transkripRoutes);

app.use((req, res) => res.status(404).json(fail('NOT_FOUND', 'Endpoint tidak ada di service ini')));
app.use(errorHandler);

export default app;
