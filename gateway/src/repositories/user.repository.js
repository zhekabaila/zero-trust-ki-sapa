// Akses tabel users untuk keperluan login & verifikasi token.
import { prisma } from '../lib/prisma.js';

export const findByEmail = (email) => prisma.user.findUnique({ where: { email } });

export const findById = (id) => prisma.user.findUnique({ where: { id } });
