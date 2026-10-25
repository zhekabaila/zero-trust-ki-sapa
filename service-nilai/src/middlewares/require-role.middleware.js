// Kebutuhan 4.2 (POLICY §5 langkah 3): role dicek ULANG di service, tidak hanya di gateway.
import { AppError } from '../lib/errors.js';

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.token.role)) {
      return next(new AppError(403, 'ROLE_NOT_ALLOWED', 'Role tidak diizinkan'));
    }
    next();
  };
}
