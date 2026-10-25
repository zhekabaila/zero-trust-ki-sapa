// Kebutuhan 4.1 (POLICY §5 langkah 1): hanya request dari gateway yang diterima.
// Duplikasi sengaja dengan versi service-nilai agar tiap service mandiri (keputusan D5).
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
