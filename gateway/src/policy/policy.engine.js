// Kebutuhan 4.2: Policy Engine (PE). Fungsi murni terhadap data: { ruleName, subject, request }
// → { decision, reason }. Urutan cek (POLICY.md §1): tipe subjek → device (USER) → role → kondisi rule.
import { R, deny, allow } from './reasons.js';
import { checkDevice } from './checks/device.check.js';
import { nilaiRules } from './rules/nilai.rules.js';
import { kelasRules } from './rules/kelas.rules.js';
import { transkripRules } from './rules/transkrip.rules.js';

const RULES = { ...nilaiRules, ...kelasRules, ...transkripRules };

export async function decide({ ruleName, subject, request }) {
  const rule = RULES[ruleName];
  if (!rule) return deny(R.ROUTE_NOT_ALLOWED);

  // 1. Tipe subjek: endpoint user menolak token service, sebaliknya juga.
  if (rule.subjectType === 'SERVICE') {
    if (subject.type !== 'SERVICE') return deny(R.SERVICE_ONLY);
  } else if (subject.type !== 'USER') {
    return deny(R.TOKEN_TYPE_INVALID);
  }

  // 2 & 3. Khusus USER: device terdaftar lalu role.
  if (subject.type === 'USER') {
    const deviceResult = await checkDevice({ subject, request });
    if (deviceResult) return deviceResult;
    if (!rule.roles.includes(subject.role)) return deny(R.ROLE_NOT_ALLOWED);
  }

  // 4. Kondisi tambahan milik rule (kepemilikan, status, jam akses).
  const ruleResult = await rule.check({ subject, request });
  if (ruleResult) return ruleResult;

  return allow();
}
