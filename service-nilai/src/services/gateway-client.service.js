// Kebutuhan 4.1: Service Nilai memanggil dunia luar SELALU lewat gateway (GATEWAY_URL),
// memakai token service berumur 5 menit yang di-cache sampai hampir kedaluwarsa.
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

// Cache token di modul: satu entry saja, cukup untuk satu proses service.
let cache = { token: null, expiresAt: 0 };

// Refresh 60 detik sebelum kedaluwarsa agar panggilan sedang tidak memakai token mati.
const REFRESH_MARGIN_MS = 60_000;

async function fetchServiceToken() {
  const res = await fetch(`${env.gatewayUrl}/auth/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: env.serviceClientId, clientSecret: env.serviceClientSecret }),
  });
  if (!res.ok) throw new AppError(502, 'SERVICE_TOKEN_FAILED', 'Gagal memperoleh token service dari gateway');
  const body = await res.json();
  cache = { token: body.data.accessToken, expiresAt: Date.now() + body.data.expiresIn * 1000 };
  return cache.token;
}

async function getServiceToken() {
  if (cache.token && Date.now() < cache.expiresAt - REFRESH_MARGIN_MS) return cache.token;
  return fetchServiceToken();
}

// Panggil POST /transkrip/sinkron lewat gateway (proxy, bukan URL service langsung).
export async function syncTranskrip(payload) {
  const token = await getServiceToken();
  const res = await fetch(`${env.gatewayUrl}/transkrip/sinkron`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AppError(502, 'SINKRON_TRANSKRIP_GAGAL', body?.error?.message || 'Sinkron transkrip gagal');
  }
  return res.json();
}
