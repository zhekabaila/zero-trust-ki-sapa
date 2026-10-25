// Aturan bisnis transkrip: kepemilikan dicek ulang dari sub token (POLICY §5 langkah 4),
// huruf/bobot dihitung sendiri oleh service ini (satu sumber kebenaran, API.md §6).
import * as transkripRepository from '../repositories/transkrip.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { toGrade, computeIpk } from '../lib/grade.js';
import { AppError } from '../lib/errors.js';

// GET /transkrip/:nim
export async function getTranskrip({ nim, role, subjectId }) {
  if (role === 'MAHASISWA') {
    const me = await userRepository.findById(subjectId);
    if (!me || me.nim !== nim) throw new AppError(403, 'NOT_OWNER', 'Hanya transkrip Anda sendiri');
  }
  const mahasiswa = await userRepository.findByNim(nim);
  if (!mahasiswa) throw new AppError(404, 'MAHASISWA_NOT_FOUND', 'NIM tidak ditemukan');

  const entries = await transkripRepository.findByMahasiswaId(mahasiswa.id);
  return {
    mahasiswa: { nim: mahasiswa.nim, name: mahasiswa.name },
    entries,
    totalSks: entries.reduce((sum, e) => sum + e.sks, 0),
    ipk: computeIpk(entries),
  };
}

// POST /transkrip/sinkron — dipanggil Service Nilai lewat gateway.
export async function sinkron(payload) {
  // Validasi ke-2: semua mahasiswaId harus benar-benar ada (jika tidak, FK Prisma akan 500).
  const found = await userRepository.existIds(payload.entries.map((e) => e.mahasiswaId));
  if (found.length !== payload.entries.length) {
    throw new AppError(400, 'MAHASISWA_NOT_FOUND', 'Ada mahasiswaId yang tidak dikenal');
  }

  for (const entry of payload.entries) {
    const grade = toGrade(entry.nilaiAngka);
    await transkripRepository.upsertEntry({
      mahasiswaId: entry.mahasiswaId,
      kelasId: payload.kelasId,
      kodeMk: payload.kodeMk,
      mataKuliah: payload.mataKuliah,
      sks: payload.sks,
      semester: payload.semester,
      nilaiAngka: entry.nilaiAngka,
      ...grade,
    });
  }
  return { jumlahDisinkron: payload.entries.length };
}
