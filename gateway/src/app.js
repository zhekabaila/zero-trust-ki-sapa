// Perakitan aplikasi gateway: urutan middleware menentukan keamanan (ARCHITECTURE §3).
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import jsYaml from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { requestId } from './middlewares/request-id.middleware.js';
import routes from './routes/index.js';
import { notFound } from './middlewares/not-found.middleware.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';

const app = express();
app.disable('x-powered-by');

// request-id paling awal: semua audit (termasuk default deny) butuh id ini.
app.use(requestId);

// Endpoint pendukung tanpa autentikasi (API.md §7).
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Swagger UI (keputusan D13) — hanya jika SWAGGER_ENABLED=true.
if (env.swaggerEnabled) {
  const specPath = fileURLToPath(new URL('./docs/openapi.yaml', import.meta.url));
  const spec = jsYaml.load(await readFile(specPath, 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}

app.use(routes);

// Semua yang lolos dari routes di atas = tidak terdaftar → default deny + audit.
app.use(notFound);
app.use(errorHandler);

export default app;
