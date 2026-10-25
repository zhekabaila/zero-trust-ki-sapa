# AGENTS.md — Instruksi untuk AI Agent

Proyek: **Sistem Nilai Zero Trust** (tugas praktikum Keamanan Informasi, Unsil). Pemilik proyek adalah pemula backend, jadi kode harus mudah dibaca dan dipelajari.

## 1. Baca dulu (berurutan)

1. `docs/PLAN.md` — keputusan, fase, definisi selesai
2. `docs/ARCHITECTURE.md` — komponen, pipeline, struktur folder
3. `docs/DATABASE.md` — schema Prisma dan seed
4. `docs/POLICY.md` — aturan akses (inti penilaian)
5. `docs/API.md` — kontrak endpoint
6. `docs/CONVENTIONS.md` — gaya kode
7. `docs/TESTING.md` — kriteria lulus per fase

Jika dokumen bertentangan dengan permintaan pengguna terbaru, ikuti pengguna dan **perbarui dokumennya**.

## 2. Stack (jangan ganti tanpa izin)

Node 22 · Express 5 · JavaScript ESM · Prisma 6 (`prisma-client-js`) · MySQL 8.4 · `jsonwebtoken` · `bcryptjs` · `zod` · `http-proxy-middleware` v3 · `swagger-ui-express` · Docker Compose · image `node:22-slim`.

## 3. Cara kerja

- Kerjakan **satu fase** dari `docs/PLAN.md` per sesi. Selesaikan dan uji sebelum lanjut.
- Setelah tiap fase: jalankan `docker compose up --build`, jalankan uji terkait dari `docs/TESTING.md`, lalu centang checklist di PLAN.md.
- Jika ada ambiguitas pada soal atau dokumen, pilih default yang tertulis di `PLAN.md §3`, catat asumsinya di akhir respons. Bertanya hanya jika benar-benar memblokir.
- Jelaskan singkat apa yang dibuat dan mengapa (pemilik ingin belajar). Jangan menulis esai.

## 4. Aturan wajib

**Arsitektur**
- Hanya gateway yang punya `ports:` di compose. Service memakai `expose:`.
- Alur lapisan: `routes → middlewares → controllers → services → repositories → Prisma`. **Prisma hanya diimpor di `repositories/`** (dan `database/prisma/seed.js`).
- Service Nilai → Service Transkrip **selalu lewat gateway** (`GATEWAY_URL`), memakai token service. Jangan memanggil `http://service-transkrip:3002` langsung.
- Policy Engine adalah fungsi murni `decide()` yang mengembalikan `{decision, reason}`; atribut diambil lewat repository.
- Default deny: route tidak dikenal ditolak dan dicatat.

**Keamanan**
- Service memverifikasi **gateway secret lalu token** sendiri; role dan scoping data juga dicek ulang di service.
- `X-Gateway-Secret` dari klien dibuang oleh gateway; gateway menambahkan miliknya.
- Bandingkan secret dengan `crypto.timingSafeEqual`.
- Token memuat klaim `type` (`access` / `service`). Token tipe salah ditolak.
- Refresh token: simpan hash SHA-256, rotasi saat refresh, logout mencabut.
- Pesan login salah selalu generik. Jangan log password/token/secret.
- Audit log ditulis untuk **setiap** keputusan, termasuk 401. Gagal menulis audit → tolak request (503).
- Jangan commit `.env`. Semua secret dari env.

**Gaya**
- Ikuti `docs/CONVENTIONS.md`: nama berkas `<nama>.<lapisan>.js`, komentar bahasa Indonesia yang menjelaskan "kenapa", fungsi pendek, tanpa kode "pintar" yang sulit dibaca.
- Setiap berkas baru diawali komentar pendek yang menyebut kebutuhan soal yang dipenuhinya.
- Duplikasi middleware kecil antar service itu **disengaja** (service mandiri). Jangan membuat paket bersama.

## 5. Perangkap yang sudah diketahui

| Masalah | Penanganan |
|---|---|
| `express.json()` global membuat proxy menggantung | Pasang hanya pada router `/auth/*` |
| Express memotong prefix saat `app.use('/nilai', proxy)`; `http-proxy-middleware` v3 ikut terpengaruh | Daftarkan proxy per route (`router.get('/nilai', ..., proxy)`) atau gunakan `pathFilter`; **uji bahwa path sampai utuh** di service |
| Container berjalan UTC → jam akses salah | Hitung jam dengan `Intl.DateTimeFormat` + `ACCESS_TIMEZONE`; jangan `new Date().getHours()` |
| Prisma gagal di alpine (OpenSSL) | Pakai `node:22-slim` dan `apt-get install -y openssl` |
| `prisma generate` tidak menemukan schema | Dockerfile menyalin `database/prisma/schema.prisma` ke `./prisma/` dan `package.json` memuat `"prisma": {"schema": "prisma/schema.prisma"}` |
| `depends_on` tanpa kondisi → app jalan sebelum DB siap | `condition: service_healthy` untuk mysql, `service_completed_successfully` untuk db-init |
| Prisma 7 memakai setup berbeda (driver adapter, `prisma.config.ts`) | Pin `prisma` dan `@prisma/client` ke `6.x` persis di `package.json` |
| Float dan Decimal | Pakai `Float`; jangan Decimal |
| `BigInt` tidak bisa di-JSON | `AuditLog.id` memakai `Int` |
| Versi paket tidak pasti | Verifikasi versi terbaru yang kompatibel saat `npm install`; pin di `package.json` |

## 6. Environment {#env}

`.env.example` harus memuat (nilai contoh, bukan rahasia asli):

```
MYSQL_ROOT_PASSWORD=
MYSQL_DATABASE=nilai_db
DATABASE_URL=mysql://root:<password>@mysql:3306/nilai_db

JWT_SECRET=                      # string acak ≥ 32 karakter
JWT_ISSUER=sistem-nilai-gateway
JWT_ACCESS_EXPIRES_IN=10m
JWT_SERVICE_EXPIRES_IN=5m
REFRESH_TOKEN_TTL_HOURS=24

GATEWAY_SECRET=                  # string acak ≥ 32 karakter
SERVICE_NILAI_CLIENT_ID=service-nilai
SERVICE_NILAI_CLIENT_SECRET=

ACCESS_HOURS_START=7
ACCESS_HOURS_END=21
ACCESS_TIMEZONE=Asia/Jakarta

EXPOSE_DENY_REASON=true          # demo: tampilkan alasan di respons 403
SWAGGER_ENABLED=true

NILAI_URL=http://service-nilai:3001
TRANSKRIP_URL=http://service-transkrip:3002
GATEWAY_URL=http://gateway:3000  # dipakai Service Nilai
```

Tiap app memvalidasi env wajib saat start (berhenti dengan pesan jelas jika kurang).

## 7. Perintah umum

```bash
cp .env.example .env              # isi secret
docker compose up --build         # jalankan semua
docker compose down -v            # reset total (hapus data)
docker compose logs -f gateway
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d   # ekspos 3001/3002 untuk demo
```

## 8. Dilarang

- Mengubah kontrak di `docs/API.md` atau `docs/POLICY.md` tanpa memperbarui dokumen dan uji terkait
- Menambah endpoint di luar Tabel 3 soal (kecuali `/health`, `/docs`)
- Melewati gateway untuk komunikasi antar-service
- Menaruh logika bisnis di controller atau query Prisma di service/controller
- Menambah dependensi besar (NestJS, TypeORM, dsb.) atau mengganti stack

## 9. Selesai berarti

Lihat `docs/PLAN.md §6`. Ringkas: jalan dari repo bersih dengan satu perintah, semua uji `T01–T30` lulus, kode mengikuti konvensi, README lengkap (cara run, akun, device ID, jam akses).
