// Prisma client tunggal untuk gateway. Diimpor HANYA oleh repositories/ (CONVENTIONS §1.7).
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
