// Titik masuk gateway (port 3000). Env divalidasi lewat import config/env.js.
import { env } from './config/env.js';
import app from './app.js';

app.listen(env.port, () => {
  console.log(`[gateway] berjalan di port ${env.port}`);
});
