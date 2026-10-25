# DEMO — Naskah Video 6–9 Menit

Soal meminta video yang menjelaskan **bagaimana setiap kebutuhan bagian 4 diterapkan, dengan menunjukkan bagian kode yang menanganinya**. Target total ±8 menit.

## 1. Persiapan sebelum rekam

- `docker compose down -v && docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build -d`
- Postman collection sudah berisi variabel token; atau terminal dengan helper dari [TESTING.md](./TESTING.md)
- Buka di editor (tab terurut): `token.service.js`, `auth.service.js`, `refresh-token.repository.js`, `service-proxy.js`, `verify-gateway-secret.middleware.js`, `verify-token.middleware.js`, `policy.engine.js`, `nilai.rules.js`, `device.check.js`, `access-hours.check.js`, `audit.service.js`
- Satu terminal menampilkan audit log (`scripts/show-audit.sh`); alternatif visual: buka `http://127.0.0.1:8081` (phpMyAdmin, login `root` + `MYSQL_ROOT_PASSWORD`) lalu tabel `audit_logs`
- Atur `ACCESS_HOURS` agar saat ini **diizinkan**, siapkan nilai kedua yang **menolak**

## 2. Alur rekaman

| Waktu | Bagian soal | Tampilkan kode | Demo di Postman/curl |
|---|---|---|---|
| 0:00–0:50 | Pengantar & arsitektur | Gambar 1, `docker-compose.yml` (hanya gateway punya `ports`) | `docker compose ps` |
| 0:50–2:00 | 4.1 Access & refresh token | `token.service.js` (10 menit, `sub`, `role`), `auth.service.js`, `refresh-token.repository.js` (hash, `revokedAt`) | Login → refresh (token lama ditolak) → logout → refresh ditolak (T01, T05, T06) |
| 2:00–2:50 | 4.1 Token service | `auth.service.js` (service token 5 menit), `gateway-client.service.js` | `POST /auth/service` benar & salah (T08) |
| 2:50–4:00 | 4.1 Gateway secret + verifikasi ulang | `service-proxy.js`, `verify-gateway-secret.middleware.js`, `verify-token.middleware.js` | Akses langsung 3001: tanpa secret, secret tanpa token, token palsu (T25) |
| 4:00–6:00 | 4.2 Kebijakan akses | `policy.engine.js`, `nilai.rules.js`, `kelas.rules.js`, `transkrip.rules.js`, `policy/reasons.js` | mhs lihat milik sendiri vs orang lain (T12, T22); dosen salah kelas (T13, T16); admin vs dosen di transkrip (T23); `/transkrip/sinkron` ditolak token user (T24) |
| 6:00–7:00 | Finalisasi + sinkron antar-service | `kelas.service.js`, `gateway-client.service.js` | Finalisasi kelas A → cek transkrip mhs1 (T19, T22) |
| 7:00–7:50 | 4.3 Verifikasi konteks | `device.check.js`, `access-hours.check.js` | Device salah (T10); ubah env jam akses → PUT ditolak (T18) |
| 7:50–8:40 | 4.4 Audit log | `audit.service.js`, `audit-log.repository.js` | Tampilkan audit: waktu, subjek, endpoint, device, hasil, alasan |
| 8:40–9:00 | Penutup | — | Ringkas: never trust, least privilege, assume breach |

## 3. Tips

- Jalankan skenario satu kali tanpa merekam untuk memastikan ID dan token benar.
- Zoom editor, perlihatkan nama berkas di tab; hindari scroll cepat.
- Setiap skenario: sebutkan **kebutuhan** → tunjukkan **kode** → jalankan **bukti** → tunjuk **audit log**.
- Jika waktu mepet, singkat bagian 4.3 dan penutup; jangan memangkas bagian 4.1 dan 4.2.
