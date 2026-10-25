// Aturan bisnis nilai. Scoping data per subjek (POLICY §5 langkah 4) dikerjakan ulang di sini,
// jadi service yang diserang langsung (tanpa gateway) tetap tidak membocorkan data.
import * as nilaiRepository from '../repositories/nilai.repository.js';
import * as kelasRepository from '../repositories/kelas.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { AppError } from '../lib/errors.js';

// GET /nilai
export async function list({ role, subjectId, queryNim, queryKelasId }) {
  if (role === 'MAHASISWA') {
    const user = await userRepository.findById(subjectId);
    // Mahasiswa hanya melihat nilainya sendiri yang FINAL; filter ?nim= harus NIM sendiri.
    if (queryNim && queryNim !== user.nim) throw new AppError(403, 'NOT_OWNER', 'Hanya NIM Anda sendiri');
    return nilaiRepository.findFinalByMahasiswa(subjectId);
  }
  if (queryKelasId) {
    const kelas = await kelasRepository.findById(queryKelasId);
    if (!kelas || kelas.dosenId !== subjectId) throw new AppError(403, 'CLASS_NOT_OWNED', 'Bukan kelas Anda');
    return nilaiRepository.findByKelas(queryKelasId);
  }
  return nilaiRepository.findByDosen(subjectId);
}

// PUT /nilai/:id — contoh alur CONVENTIONS §2.
export async function updateScore({ nilaiId, score, dosenId }) {
  const nilai = await nilaiRepository.findByIdWithKelas(nilaiId);
  if (!nilai) throw new AppError(404, 'NILAI_NOT_FOUND', 'Nilai tidak ditemukan');
  if (nilai.kelas.dosenId !== dosenId) throw new AppError(403, 'CLASS_NOT_OWNED', 'Bukan kelas Anda');
  if (nilai.status === 'FINAL') throw new AppError(403, 'NILAI_ALREADY_FINAL', 'Nilai sudah final');
  return nilaiRepository.updateScore(nilaiId, score);
}
