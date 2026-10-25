// Kebutuhan 4.4: setiap keputusan audit dikaitkan ke satu X-Request-ID; dibuat bila klien tidak kirim.
import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
  const incoming = req.header('X-Request-ID');
  // Nilai dari klien dibatasi 36 karakter agar tidak menjejali kolom VARCHAR(36).
  req.id = incoming && incoming.length <= 36 ? incoming : randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}
