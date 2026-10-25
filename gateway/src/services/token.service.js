// Kebutuhan 4.1: penerbitan & verifikasi JWT HS256.
// Access token: sub=user id, role, type=access, umur 10 menit.
// Service token: sub=clientId, role=service, type=service, umur 5 menit.
// Klaim `type` membuat token user tidak bisa menyamar sebagai token service (POLICY.md §3).
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { R } from '../policy/reasons.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, type: 'access' }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.accessExpiresIn,
    issuer: env.jwtIssuer,
  });

export const signServiceToken = (clientId) =>
  jwt.sign({ sub: clientId, role: 'service', type: 'service' }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.serviceExpiresIn,
    issuer: env.jwtIssuer,
  });

// Mengubah kesalahan jwt menjadi AppError dengan kode alasan yang tepat.
export function verifyToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'], issuer: env.jwtIssuer });
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new AppError(401, R.TOKEN_EXPIRED, 'Token kedaluwarsa');
    throw new AppError(401, R.TOKEN_INVALID, 'Token tidak valid');
  }
  if (payload.type !== 'access' && payload.type !== 'service') {
    throw new AppError(401, R.TOKEN_TYPE_INVALID, 'Klaim tipe token tidak dikenal');
  }
  return payload;
}
