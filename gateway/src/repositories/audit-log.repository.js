// Kebutuhan 4.4: satu baris audit per keputusan gateway (ALLOW maupun DENY).
import { prisma } from '../lib/prisma.js';

export const create = (entry) => prisma.auditLog.create({ data: entry });
