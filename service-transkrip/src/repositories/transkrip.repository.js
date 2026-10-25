// Prisma untuk transkrip_entries. Upsert per (mahasiswaId, kelasId) → sinkron bisa diulang aman.
import { prisma } from '../lib/prisma.js';

export const findByMahasiswaId = (mahasiswaId) =>
  prisma.transkripEntry.findMany({ where: { mahasiswaId }, orderBy: { semester: 'asc' } });

export const upsertEntry = ({ mahasiswaId, kelasId, kodeMk, mataKuliah, sks, semester, nilaiAngka, nilaiHuruf, bobot }) =>
  prisma.transkripEntry.upsert({
    where: { mahasiswaId_kelasId: { mahasiswaId, kelasId } },
    update: { kodeMk, mataKuliah, sks, semester, nilaiAngka, nilaiHuruf, bobot, syncedAt: new Date() },
    create: { mahasiswaId, kelasId, kodeMk, mataKuliah, sks, semester, nilaiAngka, nilaiHuruf, bobot },
  });
