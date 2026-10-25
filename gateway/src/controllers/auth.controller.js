// Controller /auth/*: mengambil data dari req, memanggil auth.service, mengirim respons.
// Tidak ada aturan bisnis di sini (ARCHITECTURE §5).
import * as authService from '../services/auth.service.js';
import { ok } from '../lib/response.js';

// Konteks untuk audit log diambil dari req, lalu dilewatkan sebagai data biasa.
const contextOf = (req) => ({
  requestId: req.id,
  method: req.method,
  endpoint: req.originalUrl,
  ip: req.ip,
});

export async function login(req, res) {
  const data = await authService.login({
    email: req.body.email,
    password: req.body.password,
    deviceId: req.header('X-Device-ID'),
    context: contextOf(req),
  });
  res.json(ok(data));
}

export async function refresh(req, res) {
  const data = await authService.refresh({ refreshToken: req.body.refreshToken, context: contextOf(req) });
  res.json(ok(data));
}

export async function logout(req, res) {
  await authService.logout({ refreshToken: req.body.refreshToken, context: contextOf(req) });
  res.json(ok({ loggedOut: true }));
}

export async function service(req, res) {
  const data = await authService.serviceToken({
    clientId: req.body.clientId,
    clientSecret: req.body.clientSecret,
    context: contextOf(req),
  });
  res.json(ok(data));
}
