# PLAN — Sistem Nilai Zero Trust

Tugas Praktikum Individu Zero Trust Security (Keamanan Informasi KP70065004, Informatika Unsil).
Dokumen lain: [ARCHITECTURE](./ARCHITECTURE.md) · [DATABASE](./DATABASE.md) · [API](./API.md) · [POLICY](./POLICY.md) · [CONVENTIONS](./CONVENTIONS.md) · [TESTING](./TESTING.md) · [DEMO](./DEMO.md) · [AGENTS](../AGENTS.md)

---

## 1. Ringkasan

Bangun Sistem Nilai dengan 3 aplikasi Express + 1 MySQL, semuanya via Docker Compose:

| Komponen | Port | Peran |
|---|---|---|
| API Gateway | 3000 | PEP + Policy Engine/Administrator (login, token, keputusan allow/deny, audit log) |
| Service Nilai | 3001 | Data nilai & kelas; saat finalisasi memanggil Service Transkrip **lewat gateway** |
| Service Transkrip | 3002 | Data transkrip mahasiswa |
| MySQL | 3306 | Satu database bersama (Prisma) |

Aturan emas: **hanya gateway yang bisa diakses dari luar**. Service tidak punya port publik, dan tetap memverifikasi gateway secret + token sendiri.

## 2. Keputusan teknis (final kecuali diubah user)

| # | Keputusan | Alasan |
|---|---|---|
| D1 | Express 5, JavaScript (ESM), Node 22 | PDF membebaskan bahasa. JS lebih mudah dipelajari daripada TS. Express 5 menangani error async otomatis (tanpa try/catch di setiap handler). |
| D2 | MySQL 8.4 di Docker | Permintaan user. |
| D3 | Prisma **6.x** (pin versi) | PDF hanya menyarankan tool stack, tidak mewajibkan raw query. Prisma 6 memakai setup klasik (`prisma-client-js`) yang paling sederhana untuk pemula. |
| D4 | Satu `schema.prisma` di `database/`, dipakai ketiga aplikasi | Sesuai "satu database bersama". Tiap image menyalin schema saat build. |
| D5 | Tidak ada paket JS bersama antar aplikasi | Middleware kecil (verify secret/token) sengaja diduplikasi agar tiap service mandiri dan mudah ditunjukkan di video. |
| D6 | JWT HS256 dengan satu `JWT_SECRET` | Paling sederhana. Kelemahan (service bisa memalsukan token jika dibobol) dicatat di POLICY.md. Upgrade RS256 = opsional. |
| D7 | Refresh token = string acak, disimpan **hash SHA-256**, dirotasi tiap refresh | Bisa dicabut, tidak bocor jika DB bocor. |
| D8 | Password `bcryptjs` | Tanpa build native, aman di Docker. |
| D9 | Validasi input `zod` | Pesan error jelas, sedikit kode. |
| D10 | Audit log = tabel `audit_logs`, ditulis gateway untuk **setiap** keputusan (termasuk 401) | Sesuai 4.4. Gagal menulis audit → request ditolak (fail-closed). |
| D11 | Default deny: route yang tidak terdaftar ditolak + dicatat | Prinsip zero trust. |
| D12 | Docker image `node:22-slim` (bukan alpine) | Menghindari masalah OpenSSL Prisma. |
| D13 | Swagger UI di gateway (`/docs`), bisa dimatikan lewat env | Dokumentasi API; dianggap fitur dev saja. |

## 3. Pertanyaan terbuka (default dipakai jika user tidak menjawab)

1. **Mahasiswa hanya melihat nilai berstatus FINAL?** Default: ya (nilai draft tidak bocor).
2. **Finalisasi kelas ditolak (422) jika ada nilai kosong?** Default: ya.
3. **HS256 atau RS256?** Default: HS256 (D6).
4. **`/docs` Swagger dibuka tanpa token?** Default: ya, hanya jika `SWAGGER_ENABLED=true`.
5. **User MySQL terpisah per service (least privilege di level DB)?** Default: tidak, jadi fase opsional (Fase 8).

## 4. Matriks kebutuhan → implementasi → pengujian

Dipakai juga sebagai peta untuk video demo.

| Kebutuhan PDF | Lokasi kode | Uji |
|---|---|---|
| 4.1 Access token JWT 10 menit (`sub`, `role`) | `gateway/src/services/token.service.js` | T01, T07 |
| 4.1 Refresh token 1 hari di DB, bisa dicabut, logout mencabut | `gateway/src/services/auth.service.js`, `repositories/refresh-token.repository.js` | T05, T06 |
| 4.1 Token service 5 menit `role: service` via `POST /auth/service` | `gateway/src/services/auth.service.js` | T08 |
| 4.1 Gateway secret (`X-Gateway-Secret`) | `gateway/src/proxy/service-proxy.js`, `service-*/src/middlewares/verify-gateway-secret.middleware.js` | T25 |
| 4.1 Verifikasi ulang token di service | `service-*/src/middlewares/verify-token.middleware.js` | T25 |
| 4.2 Tabel kebijakan (Tabel 3) | `gateway/src/policy/**` | T09–T24 |
| 4.3 Device terdaftar | `gateway/src/policy/checks/device.check.js` | T10 |
| 4.3 Jam akses (configurable) | `gateway/src/policy/checks/access-hours.check.js` | T17, T18 |
| 4.4 Audit log | `gateway/src/services/audit.service.js` | T27 |
| 5 Seed data (1 admin, 2 dosen, 3 mhs, 2 kelas, 1 device/user) | `database/prisma/seed.js` | README |
| 6 README + video 6–9 menit | `README.md`, [DEMO.md](./DEMO.md) | — |

## 5. Fase kerja (checklist untuk agent dan user)

Kerjakan berurutan. Setiap fase harus bisa dijalankan dan dites sebelum lanjut.

### Fase 0 — Kerangka repo
- [x] Struktur folder sesuai [ARCHITECTURE §6](./ARCHITECTURE.md)
- [x] `docker-compose.yml`, `.env.example`, `.dockerignore`, `.gitignore`
- [x] MySQL + healthcheck; tiap app punya `GET /health`
- **Selesai jika:** `docker compose up --build` menyalakan 4 container; `curl localhost:3000/health` → 200.

### Fase 1 — Database
- [x] `database/prisma/schema.prisma` sesuai [DATABASE.md](./DATABASE.md)
- [x] Migrasi awal ter-commit; container `db-init` menjalankan `migrate deploy` + seed
- **Selesai jika:** semua tabel ada, seed idempotent (boleh dijalankan ulang), 6 user + 6 device + 2 kelas + nilai.

### Fase 2 — Gateway: autentikasi
- [x] `lib/*`, `config/env.js`, `middlewares/error-handler`
- [x] `token.service` (sign/verify), `auth.service`, `auth.controller`, repositories
- [x] `POST /auth/login | refresh | logout | service`
- [x] `audit.service` + `audit-log.repository`
- **Selesai jika:** T01–T08 lulus.

### Fase 3 — Gateway: guard + proxy
- [x] `authenticate`, `enforce-policy`, `request-id`, `not-found` (default deny)
- [x] `policy.engine` + checks + rules (nilai, kelas, transkrip)
- [x] `proxy/service-proxy.js` (tambah secret, buang secret dari klien)
- **Selesai jika:** T09, T10, T28 lulus; setiap keputusan tercatat di audit log.

### Fase 4 — Service Nilai
- [x] Middleware: verify-gateway-secret, verify-token, require-role
- [x] `GET /nilai`, `PUT /nilai/:id`, `POST /kelas/:id/finalisasi`
- [x] `gateway-client.service`: ambil token service (cache sampai hampir kedaluwarsa) + panggil `POST {GATEWAY}/transkrip/sinkron`
- **Selesai jika:** T11–T21 lulus (finalisasi sampai ke Transkrip).

### Fase 5 — Service Transkrip
- [x] Middleware sama seperti Service Nilai
- [x] `GET /transkrip/:nim`, `POST /transkrip/sinkron` (hanya role `service`), konversi nilai huruf, IPK
- **Selesai jika:** T22–T26 lulus.

### Fase 6 — Pengujian menyeluruh
- [x] `scripts/smoke-test.sh` menjalankan [TESTING.md](./TESTING.md) T01–T30
- [x] `docker-compose.demo.yml` untuk mengekspos 3001/3002 saat demo akses langsung
- **Selesai jika:** semua T lulus pada instalasi bersih (`docker compose down -v && up --build`).

### Fase 7 — Dokumentasi & demo
- [x] `docs/openapi.yaml` + Swagger UI
- [x] `README.md` (cara run, akun, device ID, jam akses, troubleshooting)
- [x] Latihan demo mengikuti [DEMO.md](./DEMO.md)

### Fase 8 — Opsional (bonus)
- [ ] User MySQL berbeda per service dengan GRANT terbatas
- [ ] RS256 (gateway private key, service public key)
- [ ] Rate limit `POST /auth/login`, `helmet`
- [ ] Binding `X-Device-ID` ke refresh token

## 6. Definisi selesai (keseluruhan)

- `docker compose up --build` dari repo bersih langsung jalan, tanpa langkah manual selain menyalin `.env`.
- Semua uji T01–T30 lulus.
- Setiap kebutuhan di §4 bisa ditunjukkan di kode dalam ≤ 30 detik.
- Tidak ada secret ter-commit; hanya `.env.example`.
- Kode mengikuti [CONVENTIONS.md](./CONVENTIONS.md).
