// Kebutuhan 4.3: device harus terdaftar milik user.
import { prisma } from '../lib/prisma.js';

export const exists = (userId, deviceId) =>
  prisma.device.count({ where: { userId, deviceId } }).then((n) => n > 0);
