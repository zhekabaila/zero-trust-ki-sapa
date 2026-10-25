// Kebutuhan 4.1 + 4.4 (PEP langkah 2): verifikasi JWT → req.subject;
// setiap kegagalan (401/403) lebih dulu dicatat sebagai audit DENY.
import * as tokenService from '../services/token.service.js';
import * as auditService from '../services/audit.service.js';
import * as userRepository from '../repositories/user.repository.js';
import { AppError } from '../lib/errors.js';
import { R } from '../policy/reasons.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError(401, R.TOKEN_MISSING, 'Token tidak dikirim');

    const payload = tokenService.verifyToken(token); // lempar AppError 401 jika rusak/kedaluwarsa
    const subject = {
      type: payload.type === 'service' ? 'SERVICE' : 'USER',
      id: payload.sub,
      role: payload.role,
    };

    // USER_INACTIVE dicek ulang di sini: akun bisa dinonaktifkan setelah token diterbitkan.
    if (subject.type === 'USER') {
      const user = await userRepository.findById(subject.id);
      if (!user) throw new AppError(401, R.TOKEN_INVALID, 'Token tidak dikenal');
      if (!user.isActive) throw new AppError(403, R.USER_INACTIVE, 'Akun tidak aktif');
    }

    req.subject = subject;
    req.token = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      // Audit lebih dulu; jika audit gagal, yang keluar adalah 503 (fail-closed).
      await auditService.record({
        requestId: req.id,
        subjectType: 'ANONYMOUS',
        subjectId: req.token?.sub ?? null,
        method: req.method,
        endpoint: req.originalUrl,
        deviceId: req.header('X-Device-ID') ?? null,
        ip: req.ip,
        decision: 'DENY',
        reason: err.code,
      });
    }
    next(err);
  }
}
