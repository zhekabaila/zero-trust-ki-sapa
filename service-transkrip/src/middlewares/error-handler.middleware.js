// Penerjemah error tunggal Service Transkrip.
import { AppError } from '../lib/errors.js';
import { fail } from '../lib/response.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof AppError) {
    return res.status(err.status).json(fail(err.code, err.message));
  }
  console.error('[service-transkrip] error tak terduga:', err);
  res.status(500).json(fail('INTERNAL_ERROR', 'Terjadi kesalahan pada server'));
}
