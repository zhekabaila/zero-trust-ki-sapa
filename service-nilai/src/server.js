// Titik masuk Service Nilai (port 3001, tanpa publish ke host).
import { env } from './config/env.js';
import app from './app.js';

app.listen(env.port, () => {
  console.log(`[service-nilai] berjalan di port ${env.port}`);
});
