// Kebutuhan 4.2 (Tabel 3): rule untuk POST /kelas/:id/finalisasi.
import { R, deny } from '../reasons.js';
import * as kelasRepository from '../../repositories/kelas.repository.js';
import { checkAccessHours } from '../checks/access-hours.check.js';

export const kelasRules = {
  'kelas.finalisasi': {
    subjectType: 'USER',
    roles: ['DOSEN'],
    async check({ subject, request }) {
      const kelas = await kelasRepository.findById(request.params.id);
      if (!kelas) return deny(R.RESOURCE_NOT_FOUND);
      if (kelas.dosenId !== subject.id) return deny(R.CLASS_NOT_OWNED);
      return checkAccessHours(request.now);
    },
  },
};
