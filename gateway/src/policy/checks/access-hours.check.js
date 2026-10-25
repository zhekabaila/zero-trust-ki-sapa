// Kebutuhan 4.3: jam akses configurable. Berlaku untuk nilai.update dan kelas.finalisasi.
// Container berjalan UTC, jadi jam dihitung dengan zona waktu env, bukan jam server.
import { env } from '../../config/env.js';
import { R, deny } from '../reasons.js';

const currentHour = (now) =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: env.accessTimezone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );

// Aturan: START <= jam < END. END=24 berarti sampai tengah malam (POLICY.md §3).
export const isWithinAccessHours = (now = new Date()) => {
  const hour = currentHour(now);
  const { start, end } = env.accessHours;
  return hour >= start && (end === 24 || hour < end);
};

export const checkAccessHours = (now) =>
  isWithinAccessHours(now) ? null : deny(R.OUTSIDE_ACCESS_HOURS);
