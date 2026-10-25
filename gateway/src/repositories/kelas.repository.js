// Atribut kelas untuk Policy Engine (kepemilikan dosen) — dibaca dari DB, bukan dari token.
import { prisma } from '../lib/prisma.js';

export const findById = (id) => prisma.kelas.findUnique({ where: { id } });
