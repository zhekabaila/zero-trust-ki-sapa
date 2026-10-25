// Kebutuhan 4.1 (pertahanan berlapis, POLICY §5 langkah 2): service TIDAK percaya gateway begitu saja,
// token diverifikasi ulang (tanda tangan, exp, iss, dan klaim type).
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

// expectedType: 'access' (user) atau 'service'.
export function verifyToken(expectedType) {
  return (req, res, next) => {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(new AppError(401, 'TOKEN_MISSING', 'Token tidak dikirim'));

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'], issuer: env.jwtIssuer });
    } catch (err) {
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
      return next(new AppError(401, code, 'Token tidak valid'));
    }
    if (payload.type !== expectedType) {
      return next(new AppError(401, 'TOKEN_TYPE_INVALID', 'Tipe token tidak sesuai'));
    }
    req.token = payload;
    next();
  };
}
