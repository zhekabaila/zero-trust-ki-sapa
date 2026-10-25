// Kebutuhan 4.1 (pertahanan berlapis, POLICY §5 langkah 1): request HANYA diterima dari gateway.
// Secret dari dalam gateway sudah dipasang service-proxy.js; nilai salah/panjang beda → 403.
// Perbandingan memakai crypto.timingSafeEqual agar tebakan karakter-per-karakter tidak berguna.
import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export function verifyGatewaySecret(req, res, next) {
  const provided = Buffer.from(req.header('X-Gateway-Secret') || '');
  const expected = Buffer.from(env.gatewaySecret);
  const okSecret = provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!okSecret) return next(new AppError(403, 'GATEWAY_SECRET_INVALID', 'Request bukan dari gateway'));
  next();
}
