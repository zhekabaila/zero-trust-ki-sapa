// Prisma untuk tabel kelas + operasi finalisasi (transaksi di sini karena lintas tabel).
import { prisma } from '../lib/prisma.js';

export const findById = (id) => prisma.kelas.findUnique({ where: { id } });

// Nilai yang dibutuhkan untuk payload sinkron: id mahasiswa + angkanya.
export const findScoresByKelas = (kelasId) =>
  prisma.nilai.findMany({ where: { kelasId }, select: { mahasiswaId: true, score: true } });

// FINAL untuk SEMUA nilai kelas + stempel waktu, dalam satu transaksi (kebutuhan 4.2).
export const finalizeAll = (kelasId, at) =>
  prisma.$transaction([
    prisma.nilai.updateMany({ where: { kelasId }, data: { status: 'FINAL', finalizedAt: at } }),
    prisma.kelas.update({ where: { id: kelasId }, data: { finalizedAt: at } }),
  ]);

export const setTranskripSyncedAt = (kelasId, at) =>
  prisma.kelas.update({ where: { id: kelasId }, data: { transkripSyncedAt: at } });
