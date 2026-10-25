# API

Semua request lewat gateway: `http://localhost:3000`. Aturan akses lengkap: [POLICY.md](./POLICY.md).

## 1. Konvensi

**Header**

| Header | Dipakai di | Keterangan |
|---|---|---|
| `Authorization: Bearer <token>` | semua kecuali `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/service` | access token (user) atau token service |
| `X-Device-ID: <id>` | `/auth/login` dan semua request user | harus terdaftar untuk user tersebut |
| `X-Request-ID` | opsional | dibuat gateway jika tidak ada; dikembalikan di respons |
| `X-Gateway-Secret` | **hanya gateway → service** | jangan pernah dikirim klien (akan ditimpa/dibuang) |

**Format respons**

```json
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "CLASS_NOT_OWNED", "message": "Akses ditolak" } }
```

Jika `EXPOSE_DENY_REASON=true`, `message` pada 403 berisi alasan detail (untuk demo). Jika `false`, pesan generik `Akses ditolak`; alasan tetap tercatat di audit log.

**Status code**

| Kode | Arti |
|---|---|
| 200/201 | Berhasil |
| 400 | Input tidak valid (zod) |
| 401 | Token/kredensial tidak ada, tidak valid, atau kedaluwarsa |
| 403 | Ditolak kebijakan (role, kepemilikan, device, jam akses, dll.) atau secret gateway salah (di service) |
| 404 | Resource tidak ditemukan (dari service) |
| 409 | Konflik status (cth. kelas sudah final) |
| 422 | Data tidak memenuhi syarat bisnis (cth. ada nilai kosong saat finalisasi) |
| 502 | Service tujuan/sinkron transkrip gagal |
| 503 | Audit log tidak bisa ditulis (fail-closed) |

## 2. Endpoint auth (ditangani gateway)

### POST /auth/login
Header: `X-Device-ID`
```json
{ "email": "dosen1@unsil.test", "password": "Password123!" }
```
200:
```json
{ "success": true, "data": {
  "accessToken": "<jwt 10m>", "refreshToken": "<opaque>", "expiresIn": 600,
  "user": { "id": "...", "name": "Dosen Satu", "role": "DOSEN" } } }
```
Gagal: 401 `LOGIN_INVALID_CREDENTIALS` (pesan sama untuk email salah/password salah), 403 `DEVICE_HEADER_MISSING` / `DEVICE_NOT_REGISTERED`.

### POST /auth/refresh
```json
{ "refreshToken": "<opaque>" }
```
200: access token + refresh token **baru** (token lama langsung dicabut). Gagal: 401 `REFRESH_INVALID` / `REFRESH_REVOKED` / `REFRESH_EXPIRED`.

### POST /auth/logout
```json
{ "refreshToken": "<opaque>" }
```
200: refresh token dicabut. Idempotent.
Catatan: access token yang masih hidup tetap sah sampai kedaluwarsa (maks. 10 menit).

### POST /auth/service
```json
{ "clientId": "service-nilai", "clientSecret": "<secret>" }
```
200: `{ "accessToken": "<jwt 5m, role service>", "expiresIn": 300 }`. Gagal: 401 `SERVICE_CLIENT_INVALID`.

## 3. Klaim token

| Token | Klaim | Umur |
|---|---|---|
| Access (user) | `sub` (user id), `role`, `type: "access"`, `iss`, `iat`, `exp` | 10 menit |
| Service | `sub` (clientId), `role: "service"`, `type: "service"`, `iss`, `iat`, `exp` | 5 menit |

Klaim `type` mencegah token user dipakai sebagai token service dan sebaliknya. NIM/kelas **tidak** dimasukkan ke token; Policy Engine membacanya dari database.

## 4. Endpoint nilai (gateway → Service Nilai)

### GET /nilai
Role: MAHASISWA, DOSEN. Query opsional: `kelasId`, `nim` (hanya mahasiswa, harus NIM sendiri).

- MAHASISWA: hanya nilai miliknya, hanya status `FINAL`.
- DOSEN: nilai kelas yang diampu. Tanpa `kelasId` → semua kelas yang diampu. Dengan `kelasId` milik dosen lain → 403.

200:
```json
{ "success": true, "data": [ {
  "id": "...", "kelas": { "id": "...", "kode": "IF301-A", "mataKuliah": "Keamanan Informasi", "sks": 3 },
  "mahasiswa": { "id": "...", "nim": "247006111001", "name": "Mahasiswa Satu" },
  "score": 88, "status": "DRAFT" } ] }
```

### PUT /nilai/:id
Role: DOSEN. Syarat: kelas diampu, status `DRAFT`, dalam jam akses.
```json
{ "score": 91.5 }
```
`score`: angka 0–100. 200: nilai terbaru. Gagal kebijakan: 403 (lihat reason di POLICY).

### POST /kelas/:id/finalisasi
Role: DOSEN. Syarat: kelas diampu, dalam jam akses. Tanpa body.

Proses di Service Nilai: tolak 422 `NILAI_KOSONG` jika ada `score` null → ubah semua nilai kelas ke `FINAL` (transaksi) → ambil token service → `POST /transkrip/sinkron` lewat gateway → set `transkripSyncedAt`.

- 200: `{ "kelasId": "...", "jumlahNilai": 3, "transkripTersinkron": true }`
- 409 `KELAS_SUDAH_FINAL`: sudah final dan sudah tersinkron
- 502 `SINKRON_TRANSKRIP_GAGAL`: nilai sudah FINAL tetapi sinkron gagal; panggil ulang endpoint ini untuk mengulang sinkron

## 5. Endpoint transkrip (gateway → Service Transkrip)

### GET /transkrip/:nim
Role: MAHASISWA (NIM sendiri), ADMIN (semua). Dosen → 403.

200:
```json
{ "success": true, "data": {
  "mahasiswa": { "nim": "247006111001", "name": "Mahasiswa Satu" },
  "entries": [ { "kodeMk": "IF301", "mataKuliah": "Keamanan Informasi", "sks": 3,
                 "semester": "2026/Ganjil", "nilaiAngka": 88, "nilaiHuruf": "A", "bobot": 4 } ],
  "totalSks": 3, "ipk": 4.0 } }
```
Transkrip kosong → `entries: []`, `ipk: 0`. NIM tidak ada → 404.

### POST /transkrip/sinkron
**Hanya token service** (token user mana pun, termasuk admin, ditolak).
```json
{ "kelasId": "...", "kodeMk": "IF301", "mataKuliah": "Keamanan Informasi", "sks": 3, "semester": "2026/Ganjil",
  "entries": [ { "mahasiswaId": "...", "nilaiAngka": 88 } ] }
```
Transkrip menghitung huruf/bobot sendiri lalu `upsert` per `(mahasiswaId, kelasId)`. 200: `{ "jumlahDisinkron": 3 }`.

## 6. Konversi nilai (di `service-transkrip/src/lib/grade.js`)

| Angka | Huruf | Bobot |
|---|---|---|
| 85–100 | A | 4.0 |
| 70–84.99 | B | 3.0 |
| 55–69.99 | C | 2.0 |
| 40–54.99 | D | 1.0 |
| < 40 | E | 0.0 |

IPK = Σ(bobot × SKS) / Σ SKS, dibulatkan 2 desimal.

## 7. Endpoint pendukung

| Endpoint | Keterangan |
|---|---|
| `GET /health` (gateway, 3001, 3002) | Tanpa autentikasi, hanya `{status:"ok"}`. Di service, route ini tidak butuh secret agar healthcheck Docker jalan. |
| `GET /docs` (gateway) | Swagger UI; aktif hanya jika `SWAGGER_ENABLED=true` |
