// Kebutuhan 4.2 (Tabel 3): rule untuk GET /nilai dan PUT /nilai/:id.
// Pen Ownership & status dibaca dari database lewat repository, bukan dari isi token.
import { R, deny } from '../reasons.js';
import * as userRepository from '../../repositories/user.repository.js';
import * as kelasRepository from '../../repositories/kelas.repository.js';
import * as nilaiRepository from '../../repositories/nilai.repository.js';
import { checkAccessHours } from '../checks/access-hours.check.js';

export const nilaiRules = {
  // GET /nilai — mahasiswa hanya Nim miliknya; dosen hanya kelas yang diampu.
  'nilai.list': {
    subjectType: 'USER',
    roles: ['MAHASISWA', 'DOSEN'],
    async check({ subject, request }) {
      if (subject.role === 'MAHASISWA') {
        const user = await userRepository.findById(subject.id);
        if (request.query.nim && request.query.nim !== user.nim) return deny(R.NOT_OWNER);
        return null;
      }
      if (request.query.kelasId) {
        const kelas = await kelasRepository.findById(request.query.kelasId);
        if (!kelas) return deny(R.RESOURCE_NOT_FOUND);
        if (kelas.dosenId !== subject.id) return deny(R.CLASS_NOT_OWNED);
      }
      return null;
    },
  },

  // PUT /nilai/:id — urut: ownership → status → jam akses (POLICY.md §2).
  'nilai.update': {
    subjectType: 'USER',
    roles: ['DOSEN'],
    async check({ subject, request }) {
      const nilai = await nilaiRepository.findByIdWithKelas(request.params.id);
      if (!nilai) return deny(R.RESOURCE_NOT_FOUND);
      if (nilai.kelas.dosenId !== subject.id) return deny(R.CLASS_NOT_OWNED);
      if (nilai.status === 'FINAL') return deny(R.NILAI_ALREADY_FINAL);
      return checkAccessHours(request.now);
    },
  },
};
