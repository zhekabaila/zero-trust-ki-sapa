// Controller nilai: hanya membaca req, memanggil service, menulis res (ARCHITECTURE §5).
import * as nilaiService from '../services/nilai.service.js';
import { ok } from '../lib/response.js';

export async function list(req, res) {
  const data = await nilaiService.list({
    role: req.token.role,
    subjectId: req.token.sub,
    queryNim: req.query.nim,
    queryKelasId: req.query.kelasId,
  });
  res.json(ok(data));
}

export async function update(req, res) {
  const data = await nilaiService.updateScore({
    nilaiId: req.params.id,
    score: req.body.score,
    dosenId: req.token.sub,
  });
  res.json(ok(data));
}
