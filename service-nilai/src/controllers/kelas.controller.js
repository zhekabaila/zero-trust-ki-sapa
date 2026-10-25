// Controller kelas: finalisasi (tanpa body).
import * as kelasService from '../services/kelas.service.js';
import { ok } from '../lib/response.js';

export async function finalisasi(req, res) {
  const data = await kelasService.finalize({ kelasId: req.params.id, dosenId: req.token.sub });
  res.json(ok(data));
}
