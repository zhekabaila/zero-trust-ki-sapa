# Sistem Nilai Zero Trust

Tugas praktikum Keamanan Informasi (KP70065004, Informatika Unsil). Sistem nilai kuliah dengan
arsitektur **Zero Trust** (NIST SP 800-207): satu API Gateway sebagai-satunya pintu masuk,
Policy Engine yang mengambil keputusan ALLOW/DENY untuk setiap request, dan audit log untuk
**semua** keputusan.

| Komponen | Port | Peran |
|---|---|---|
| API Gateway | 3000 (satu-satunya port publik) | Login & token (Policy Administrator), evaluasi kebijakan (Policy Engine), penerusan request (PEP), audit log |
| Service Nilai | 3001 (internal) | Data nilai & kelas; finalisasi memanggil Transkrip **lewat gateway** |
| Service Transkrip | 3002 (internal) | Data transkrip & IPK |
| MySQL 8.4 | 3306 (internal; dev: `127.0.0.1:3307`) | Database bersama (Prisma) |
| phpMyAdmin | `127.0.0.1:8081` (dev) | Melihat isi tabel lewat browser, termasuk `audit_logs` |

Dokumen lengkap: [docs/PLAN.md](docs/PLAN.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/POLICY.md](docs/POLICY.md) · [docs/API.md](docs/API.md) · [docs/DATABASE.md](docs/DATABASE.md) ·
[docs/TESTING.md](docs/TESTING.md) · [docs/DEMO.md](docs/DEMO.md)

## 1. Cara menjalankan

Prasyarat: Docker + Docker Compose.

```bash
cp .env.example .env
# isi 4 nilai kosong di .env: MYSQL_ROOT_PASSWORD, JWT_SECRET, GATEWAY_SECRET, SERVICE_NILAI_CLIENT_SECRET
# contoh pembuat nilai acak (>= 32 karakter):
openssl rand -hex 32

docker compose up --build      # satu perintah: DB + migrasi + seed + 3 aplikasi
```

Verifikasi:

```bash
curl http://localhost:3000/health   # {"status":"ok"}
open http://localhost:3000/docs     # Swagger UI
```

Reset total (hapus semua data): `docker compose down -v`.

Melihat database lewat browser (opsional, hanya localhost): buka <http://127.0.0.1:8081>,
login user `root` dengan password `MYSQL_ROOT_PASSWORD` di `.env`, pilih database `nilai_db`.

## 2. Akun demo

Password **semua akun**: `Password123!`

| Role | Email | Device ID (header `X-Device-ID`) |
|---|---|---|
| ADMIN | `admin@unsil.test` | `ADMIN-LAPTOP-01` |
| DOSEN | `dosen1@unsil.test` | `DOSEN1-LAPTOP-01` |
| DOSEN | `dosen2@unsil.test` | `DOSEN2-LAPTOP-01` |
| MAHASISWA | `mhs1@unsil.test` (NIM `247006111001`) | `MHS1-HP-01` |
| MAHASISWA | `mhs2@unsil.test` (NIM `247006111002`) | `MHS2-HP-01` |
| MAHASISWA | `mhs3@unsil.test` (NIM `247006111003`) | `MHS3-HP-01` |

Kelas seed: `IF301-A` (Keamanan Informasi, dosen1, mhs1=88 mhs2=76 mhs3=64) dan
`IF302-A` (Basis Data, dosen2, mhs1=90 mhs2=72). Service client: `service-nilai`
(secret = `SERVICE_NILAI_CLIENT_SECRET` di `.env`).

## 3. Jam akses (kebutuhan 4.3)

Ubah/finalisasi nilai hanya boleh pada **07.00–21.00 WIB** (`ACCESS_HOURS_START/END/TIMEZONE`
di `.env`). Di luar itu: 403 `OUTSIDE_ACCESS_HOURS` (tetap tercatat di audit).

```bash
# contoh membuka jendela sempit untuk demo penolakan di siang hari:
sed -i '' 's/^ACCESS_HOURS_START=.*/ACCESS_HOURS_START=1/;s/^ACCESS_HOURS_END=.*/ACCESS_HOURS_END=2/' .env
docker compose up -d --force-recreate gateway
```

## 4. Postman & demo video

Import [`postman/Sistem Nilai Zero Trust.postman_collection.json`](postman):

- Folder reguler per endpoint: **Auth, Nilai, Kelas, Transkrip, System**.
- Folder **★ DEMO_URUTAN**: 25 request bernomor urut untuk rekaman 6–9 menit
  (permintaan soal). Klik atas ke bawah; token & id captured otomatis oleh test script.
- **Isi dulu 2 variabel collection** dari `.env` Anda: `gatewaySecret` dan
  `serviceClientSecret` (untuk uji akses langsung ke service).
- Untuk request demo 06–07 (akses langsung ditolak), jalankan dengan overlay demo:
  `docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d`

Tips jam: rekam sebelum 21.00 WIB agar langkah "PUT nilai" (boleh) dan langkah 23
(tolak setelah diubah) bekerja alami tanpa mengganti config; atau gunakan cara di §3.

## 5. Uji otomatis (T01–T30)

```bash
docker compose down -v && docker compose up --build -d
bash scripts/smoke-test.sh        # harus keluar dengan kode 0 (LULUS=60 GAGAL=0)
bash scripts/show-audit.sh        # 20 keputusan audit terakhir
```

## 6. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `db-init` gagal saat start pertama | MySQL belum benar-benar siap | sudah diatasi retry otomatis; cek `docker compose logs db-init` |
| Gateway mati saat start | `.env` kosong / secret < 32 karakter | pesan error menyebut nama variabel yang hilang |
| 403 `DEVICE_*` saat login | lupa header `X-Device-ID` / device bukan milik user itu | pakai tabel akun di atas |
| 403 `OUTSIDE_ACCESS_HOURS` | di luar 07–21 WIB | lihat §3 |
| 401 `TOKEN_EXPIRED` | access token > 10 menit | `POST /auth/refresh` |
| Proxy 502 `SERVICE_UNAVAILABLE` | service mati | `docker compose ps`, `docker compose logs service-nilai` |
| Prisma error OpenSSL | image alpine | proyek ini memakai `node:22-slim` — jangan diganti |

## 7. Peta kebutuhan soal → kode

| Kebutuhan | Kode |
|---|---|
| 4.1 access token JWT 10m | `gateway/src/services/token.service.js` |
| 4.1 refresh token (hash, rotasi, cabut) | `gateway/src/services/auth.service.js`, `gateway/src/repositories/refresh-token.repository.js` |
| 4.1 token service 5m | `token.service.js` (`signServiceToken`), `POST /auth/service` |
| 4.1 gateway secret + verifikasi ulang | `gateway/src/proxy/service-proxy.js`, `service-*/src/middlewares/verify-gateway-secret.middleware.js`, `verify-token.middleware.js` |
| 4.2 kebijakan akses (Tabel 3) | `gateway/src/policy/policy.engine.js`, `policy/rules/*`, `policy/reasons.js` |
| 4.3 device terdaftar | `gateway/src/policy/checks/device.check.js` |
| 4.3 jam akses | `gateway/src/policy/checks/access-hours.check.js` |
| 4.4 audit log (fail-closed) | `gateway/src/services/audit.service.js`, `repositories/audit-log.repository.js` |
| finalisasi → sinkron antar-service via gateway | `service-nilai/src/services/kelas.service.js`, `gateway-client.service.js` |
