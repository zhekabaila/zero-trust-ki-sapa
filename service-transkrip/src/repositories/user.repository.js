// Prisma untuk lookup user (NIM → mahasiswa, kepemilikan).
import { prisma } from '../lib/prisma.js';

export const findById = (id) => prisma.user.findUnique({ where: { id } });

export const findByNim = (nim) => prisma.user.findUnique({ where: { nim } });

export const existIds = (ids) =>
  prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
