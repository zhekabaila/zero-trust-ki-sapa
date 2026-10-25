// Kebutuhan 4.4: audit log untuk SETIAP keputusan. Fail-closed: gagal menulis audit
// berarti request ditolak (503) — keputusan tanpa jejak lebih berbahaya daripada request gagal.
import * as auditLogRepository from '../repositories/audit-log.repository.js';
import { AppError } from '../lib/errors.js';
import { R } from '../policy/reasons.js';

// entry: { requestId, subjectType, subjectId, role, method, endpoint, deviceId, ip, decision, reason }
export async function record(entry) {
  try {
    await auditLogRepository.create({ ...entry, endpoint: String(entry.endpoint).slice(0, 255) });
  } catch (err) {
    console.error('[audit] gagal menulis audit log:', err.message);
    throw new AppError(503, R.AUDIT_WRITE_FAILED, 'Audit log tidak dapat ditulis');
  }
}
