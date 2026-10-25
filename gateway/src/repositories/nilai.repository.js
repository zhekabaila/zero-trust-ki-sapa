// Atribut nilai untuk Policy Engine (kepemilikan kelas + status DRAFT/FINAL).
import { prisma } from '../lib/prisma.js';

export const findByIdWithKelas = (id) =>
  prisma.nilai.findUnique({ where: { id }, include: { kelas: true } });
