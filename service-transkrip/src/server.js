// Titik masuk Service Transkrip (port 3002, tanpa publish ke host).
import { env } from './config/env.js';
import app from './app.js';

app.listen(env.port, () => {
  console.log(`[service-transkrip] berjalan di port ${env.port}`);
});
