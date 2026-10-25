// Kebutuhan 4.1 (Policy Administrator): login, rotasi refresh token, logout, token service.
// Service tidak menyentuh req/res; konteks request (requestId, ip, dst.) dilewatkan sebagai data biasa.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import * as userRepository from '../repositories/user.repository.js';
import * as deviceRepository from '../repositories/device.repository.js';
import * as refreshTokenRepository from '../repositories/refresh-token.repository.js';
import * as serviceClientRepository from '../repositories/service-client.repository.js';
import * as auditService from './audit.service.js';
import * as tokenService from './token.service.js';
import { sha256 } from '../lib/hash.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { R } from '../policy/reasons.js';

const randomToken = () => crypto.randomBytes(48).toString('base64url');

// Menulis audit lalu melempar error — menjamin setiap DENY tercatat sebelum respons keluar.
async function denyWithAudit(context, fields, status, code, message) {
  await auditService.record({ ...context, decision: 'DENY', reason: code, ...fields });
  throw new AppError(status, code, message);
}

export async function login({ email, password, deviceId, context }) {
  if (!deviceId) {
    await denyWithAudit(context, { subjectType: 'ANONYMOUS', subjectId: email }, 403, R.DEVICE_HEADER_MISSING, 'Header X-Device-ID tidak dikirim');
  }

  const user = await userRepository.findByEmail(email);
  const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    // Pesan selalu generik: email salah dan password salah tidak bisa dibedakan penyerang.
    await denyWithAudit(context, { subjectType: 'ANONYMOUS', subjectId: email, deviceId }, 401, R.LOGIN_INVALID_CREDENTIALS, 'Email atau password salah');
  }

  const deviceOk = await deviceRepository.exists(user.id, deviceId);
  if (!deviceOk) {
    await denyWithAudit(context, { subjectType: 'USER', subjectId: user.id, role: user.role, deviceId }, 403, R.DEVICE_NOT_REGISTERED, 'Device tidak terdaftar untuk akun ini');
  }
  if (!user.isActive) {
    await denyWithAudit(context, { subjectType: 'USER', subjectId: user.id, role: user.role, deviceId }, 403, R.USER_INACTIVE, 'Akun tidak aktif');
  }

  const refreshToken = randomToken();
  await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    deviceId,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlHours * 3600_000),
  });

  await auditService.record({ ...context, subjectType: 'USER', subjectId: user.id, role: user.role, deviceId, decision: 'ALLOW', reason: R.ALLOWED });
  return {
    accessToken: tokenService.signAccessToken(user),
    refreshToken,
    expiresIn: env.accessExpiresSeconds,
    user: { id: user.id, name: user.name, role: user.role },
  };
}

export async function refresh({ refreshToken, context }) {
  const row = await refreshTokenRepository.findByHash(sha256(refreshToken));
  const base = { subjectType: 'USER', subjectId: row?.userId ?? null, role: row?.user?.role ?? null };

  if (!row) await denyWithAudit(context, base, 401, R.REFRESH_INVALID, 'Refresh token tidak dikenal');
  if (row.revokedAt) await denyWithAudit(context, base, 401, R.REFRESH_REVOKED, 'Refresh token sudah dicabut');
  if (row.expiresAt < new Date()) await denyWithAudit(context, base, 401, R.REFRESH_EXPIRED, 'Refresh token kedaluwarsa');
  if (!row.user.isActive) await denyWithAudit(context, base, 403, R.USER_INACTIVE, 'Akun tidak aktif');

  // Rotasi (D7): token lama dicabut, satu pasang token baru diterbitkan.
  await refreshTokenRepository.revoke(row.id);
  const newRefreshToken = randomToken();
  await refreshTokenRepository.create({
    userId: row.userId,
    tokenHash: sha256(newRefreshToken),
    deviceId: row.deviceId,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlHours * 3600_000),
  });

  await auditService.record({ ...context, ...base, decision: 'ALLOW', reason: R.ALLOWED });
  return {
    accessToken: tokenService.signAccessToken(row.user),
    refreshToken: newRefreshToken,
    expiresIn: env.accessExpiresSeconds,
  };
}

// Idempotent: token tidak dikenal / sudah dicabut tetap menghasilkan 200.
export async function logout({ refreshToken, context }) {
  const row = await refreshTokenRepository.findByHash(sha256(refreshToken));
  if (row && !row.revokedAt) await refreshTokenRepository.revoke(row.id);
  await auditService.record({
    ...context,
    subjectType: 'USER',
    subjectId: row?.userId ?? null,
    decision: 'ALLOW',
    reason: R.ALLOWED,
  });
}

export async function serviceToken({ clientId, clientSecret, context }) {
  const client = await serviceClientRepository.findByClientId(clientId);
  const secretOk = client?.isActive ? await bcrypt.compare(clientSecret, client.secretHash) : false;
  if (!secretOk) {
    await denyWithAudit(context, { subjectType: 'SERVICE', subjectId: clientId }, 401, R.SERVICE_CLIENT_INVALID, 'Kredensial service client salah');
  }
  await auditService.record({ ...context, subjectType: 'SERVICE', subjectId: client.clientId, role: 'service', decision: 'ALLOW', reason: R.ALLOWED });
  return {
    accessToken: tokenService.signServiceToken(client.clientId),
    expiresIn: env.serviceExpiresSeconds,
  };
}
