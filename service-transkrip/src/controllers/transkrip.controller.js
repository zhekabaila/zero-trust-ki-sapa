// Controller transkrip: HTTP saja (ARCHITECTURE §5).
import * as transkripService from '../services/transkrip.service.js';
import { ok } from '../lib/response.js';

export async function get(req, res) {
  const data = await transkripService.getTranskrip({
    nim: req.params.nim,
    role: req.token.role,
    subjectId: req.token.sub,
  });
  res.json(ok(data));
}

export async function sinkron(req, res) {
  const data = await transkripService.sinkron(req.body);
  res.json(ok(data));
}
