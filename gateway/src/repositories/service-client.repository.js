// Kebutuhan 4.1: pemanggil POST /auth/service dikenali lewat tabel service_clients.
import { prisma } from '../lib/prisma.js';

export const findByClientId = (clientId) =>
  prisma.serviceClient.findUnique({ where: { clientId } });
