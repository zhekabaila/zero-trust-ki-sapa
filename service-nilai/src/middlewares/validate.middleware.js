// Validasi sederhana ala CONVENTIONS §4 untuk service (parse body → ganti nilai bersih).
import { AppError } from '../lib/errors.js';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      return next();
    }
    const detail = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    next(new AppError(400, 'VALIDATION_ERROR', detail));
  };
}
