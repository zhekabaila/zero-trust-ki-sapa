// Kebutuhan 4.1: refresh token di DB, bisa dicabut, dirotasi. Hanya hash yang pernah singgung DB.
import { prisma } from '../lib/prisma.js';

export const create = ({ userId, tokenHash, deviceId, expiresAt }) =>
  prisma.refreshToken.create({ data: { userId, tokenHash, deviceId, expiresAt } });

export const findByHash = (tokenHash) =>
  prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

export const revoke = (id) =>
  prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
