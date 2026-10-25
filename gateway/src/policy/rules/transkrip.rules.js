// Kebutuhan 4.2 (Tabel 3): rule untuk GET /transkrip/:nim dan POST /transkrip/sinkron.
import { R, deny } from '../reasons.js';
import { env } from '../../config/env.js';
import * as userRepository from '../../repositories/user.repository.js';

export const transkripRules = {
  // GET /transkrip/:nim — mahasiswa: hanya NIM sendiri; admin: semua; dosen: tolak.
  'transkrip.get': {
    subjectType: 'USER',
    roles: ['MAHASISWA', 'ADMIN'],
    async check({ subject, request }) {
      if (subject.role === 'MAHASISWA') {
        const user = await userRepository.findById(subject.id);
        if (request.params.nim !== user.nim) return deny(R.NOT_OWNER);
      }
      return null;
    },
  },

  // POST /transkrip/sinkron — hanya service client yang sah (least privilege).
  'transkrip.sinkron': {
    subjectType: 'SERVICE',
    async check({ subject }) {
      if (subject.id !== env.serviceNilaiClientId) return deny(R.SERVICE_ONLY);
      return null;
    },
  },
};
