// Kebutuhan 4.1 (PEP langkah 4): meneruskan request ke service tujuan.
// Keamanan: header X-Gateway-Secret kiriman klien SELALU dibuang, lalu gateway memasang
// secret miliknya sendiri — klien tidak bisa pura-pura menjadi gateway (T25/T28).
import { createProxyMiddleware } from 'http-proxy-middleware';
import { env } from '../config/env.js';
import { fail } from '../lib/response.js';

// Middleware kecil sebelum proxy: buang secret dari klien.
const stripClientSecret = (req, res, next) => {
  delete req.headers['x-gateway-secret'];
  next();
};

export function createServiceProxy(target) {
  const proxy = createProxyMiddleware({
    target,
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('X-Gateway-Secret', env.gatewaySecret);
        proxyReq.setHeader('X-Request-ID', req.id);
      },
      error: (err, req, res) => {
        console.error(`[gateway] [${req.id}] proxy gagal ke ${target}: ${err.message}`);
        if (res.writeHead && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify(fail('SERVICE_UNAVAILABLE', 'Service tujuan tidak dapat dijangkau')));
      },
    },
  });
  // Array handler: Express menjalankan keduanya berurutan pada route yang sama.
  return [stripClientSecret, proxy];
}
