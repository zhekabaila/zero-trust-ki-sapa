// Penerjemah error tunggal (CONVENTIONS §3): AppError → respons fail; sisanya → 500 tanpa detail.
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { fail } from '../lib/response.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.status).json(fail(err.code, err.message));
  }
  if (err instanceof ZodError) {
    return res.status(400).json(fail('VALIDATION_ERROR', 'Body request tidak valid'));
  }

  // Error tak terduga: detail hanya ke log server, tidak ke klien.
  console.error(`[gateway] [${req.id}] error tak terduga:`, err);
  res.status(500).json(fail('INTERNAL_ERROR', 'Terjadi kesalahan pada server'));
}
