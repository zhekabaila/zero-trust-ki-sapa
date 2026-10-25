// Kebutuhan 4.2 (default deny): route yang tidak ada di Tabel 3 ditolak DAN dicatat.
import * as auditService from '../services/audit.service.js';
import { AppError } from '../lib/errors.js';
import { R } from '../policy/reasons.js';

export async function notFound(req, res, next) {
  await auditService.record({
    requestId: req.id,
    subjectType: 'ANONYMOUS',
    method: req.method,
    endpoint: req.originalUrl,
    deviceId: req.header('X-Device-ID') ?? null,
    ip: req.ip,
    decision: 'DENY',
    reason: R.ROUTE_NOT_ALLOWED,
  });
  next(new AppError(403, R.ROUTE_NOT_ALLOWED, 'Route tidak terdaftar (default deny)'));
}
