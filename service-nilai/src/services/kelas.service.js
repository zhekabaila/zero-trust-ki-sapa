// Kebutuhan 4.2 + alur antar-service: finalisasi kelas lalu sinkron transkrip LEWAT gateway.
// Urutan (API.md §4): tolak 422 bila ada nilai kosong → FINAL-kan (transaksi) → sinkron →
// catat transkripSyncedAt. Bila sinkron gagal: nilai tetap FINAL, sinkron bisa diulang (idempotent).
import * as kelasRepository from '../repositories/kelas.repository.js';
import * as gatewayClient from './gateway-client.service.js';
import { AppError } from '../lib/errors.js';

export async function finalize({ kelasId, dosenId }) {
  const kelas = await kelasRepository.findById(kelasId);
  if (!kelas) throw new AppError(404, 'KELAS_NOT_FOUND', 'Kelas tidak ditemukan');
  if (kelas.dosenId !== dosenId) throw new AppError(403, 'CLASS_NOT_OWNED', 'Bukan kelas Anda');

  // Sudah final DAN tersinkron = tidak ada pekerjaan tersisa (T21).
  if (kelas.finalizedAt && kelas.transkripSyncedAt) {
    throw new AppError(409, 'KELAS_SUDAH_FINAL', 'Kelas sudah final dan transkrip sudah tersinkron');
  }

  const scores = await kelasRepository.findScoresByKelas(kelasId);
  if (scores.some((s) => s.score === null)) {
    throw new AppError(422, 'NILAI_KOSONG', 'Masih ada nilai kosong, finalisasi ditolak');
  }

  const now = new Date();
  // Kelas bisa final tapi sinkron gagal sebelumnya → langkah ini dilewati, hanya ulangi sinkron.
  if (!kelas.finalizedAt) await kelasRepository.finalizeAll(kelasId, now);

  await gatewayClient.syncTranskrip({
    kelasId: kelas.id,
    kodeMk: kelas.kodeMk,
    mataKuliah: kelas.mataKuliah,
    sks: kelas.sks,
    semester: kelas.semester,
    entries: scores.map((s) => ({ mahasiswaId: s.mahasiswaId, nilaiAngka: s.score })),
  });

  await kelasRepository.setTranskripSyncedAt(kelasId, new Date());
  return { kelasId: kelas.id, jumlahNilai: scores.length, transkripTersinkron: true };
}
