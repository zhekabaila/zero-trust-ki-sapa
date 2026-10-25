// Prisma untuk atribut user (NIM milik subjek) — dipakai scoping mahasiswa di service.
import { prisma } from '../lib/prisma.js';

export const findById = (id) => prisma.user.findUnique({ where: { id } });
