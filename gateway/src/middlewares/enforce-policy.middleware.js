// Kebutuhan 4.2 (PEP langkah 3): panggil Policy Engine, tulis audit ALLOW/DENY,
// DENY → 403. Pesan detail hanya ditampilkan bila EXPOSE_DENY_REASON=true (berguna untuk demo).
import { decide } from '../policy/policy.engine.js';
import * as auditService from '../services/audit.service.js';
import { AppError } from '../lib/errors.js';
import { R, REASON_MESSAGE } from '../policy/reasons.js';
import { env } from '../config/env.js';

export function enforcePolicy(ruleName) {
  return async function (req, res, next) {
    const request = {
      method: req.method,
      path: req.path,
      params: req.params,
      query: req.query,
      deviceId: req.header('X-Device-ID'),
      now: new Date(),
    };

    const result = await decide({ ruleName, subject: req.subject, request });

    await auditService.record({
      requestId: req.id,
      subjectType: req.subject.type,
      subjectId: req.subject.id,
      role: req.subject.role,
      method: req.method,
      endpoint: req.originalUrl,
      deviceId: request.deviceId ?? null,
      ip: req.ip,
      decision: result.decision,
      reason: result.reason,
    });

    if (result.decision === 'DENY') {
      const detail = REASON_MESSAGE[result.reason] ?? 'Akses ditolak';
      const message = env.exposeDenyReason ? detail : 'Akses ditolak';
      return next(new AppError(403, result.reason, message));
    }
    next();
  };
}
