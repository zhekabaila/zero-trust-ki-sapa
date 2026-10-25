// Satu-satunya tempat Prisma untuk tabel nilai di Service Nilai.
import { prisma } from '../lib/prisma.js';

const detailInclude = { kelas: true, mahasiswa: true };

// Mahasiswa: hanya nilai FINAL miliknya sendiri (default PLAN §3 no.1 — draft tidak bocor).
export const findFinalByMahasiswa = (mahasiswaId) =>
  prisma.nilai.findMany({ where: { mahasiswaId, status: 'FINAL' }, include: detailInclude });

// Dosen: nilai pada satu kelas yang diampunya.
export const findByKelas = (kelasId) =>
  prisma.nilai.findMany({ where: { kelasId }, include: detailInclude });

// Dosen tanpa kelasId: semua nilai di kelas-kelas yang ia ampu.
export const findByDosen = (dosenId) =>
  prisma.nilai.findMany({ where: { kelas: { dosenId } }, include: detailInclude });

export const findByIdWithKelas = (id) =>
  prisma.nilai.findUnique({ where: { id }, include: detailInclude });

export const updateScore = (id, score) =>
  prisma.nilai.update({ where: { id }, data: { score }, include: detailInclude });
