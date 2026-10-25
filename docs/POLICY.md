# POLICY — Kebijakan Akses & Zero Trust

Implementasi Tabel 3 dan bagian 4.3 soal. Kode: `gateway/src/policy/`.

## 1. Kontrak Policy Engine

```js
// policy.engine.js
decide({ ruleName, subject, request })
// subject : { type: 'USER'|'SERVICE', id, role }
// request : { method, path, params, query, deviceId, now }
// return  : { decision: 'ALLOW'|'DENY', reason: 'KODE_ALASAN' }
```

- Fungsi ini **tidak** menyentuh `req/res`; hanya menerima data biasa, sehingga mudah dites dan dijelaskan.
- Atribut (kelas, nilai, device, NIM) dibaca lewat repository, bukan dari isi token.
- Urutan cek: tipe subjek → device (khusus USER) → role → kepemilikan → status → jam akses. Cek pertama yang gagal menentukan `reason`.
- Tidak ada rule cocok → `DENY ROUTE_NOT_ALLOWED`.

## 2. Tabel keputusan per rule

| Rule | Subjek | Role | Kondisi tambahan | Reason jika ditolak |
|---|---|---|---|---|
| `nilai.list` | USER | MAHASISWA | `query.nim` kosong atau = NIM sendiri | `NOT_OWNER` |
| | | DOSEN | jika `query.kelasId` ada: `kelas.dosenId = user.id` | `CLASS_NOT_OWNED`, `RESOURCE_NOT_FOUND` |
| `nilai.update` | USER | DOSEN | nilai ada → `kelas.dosenId = user.id` → `status = DRAFT` → jam akses | `RESOURCE_NOT_FOUND`, `CLASS_NOT_OWNED`, `NILAI_ALREADY_FINAL`, `OUTSIDE_ACCESS_HOURS` |
| `kelas.finalisasi` | USER | DOSEN | kelas ada → `kelas.dosenId = user.id` → jam akses | `RESOURCE_NOT_FOUND`, `CLASS_NOT_OWNED`, `OUTSIDE_ACCESS_HOURS` |
| `transkrip.get` | USER | MAHASISWA | `params.nim` = NIM sendiri | `NOT_OWNER` |
| | | ADMIN | semua NIM | — |
| `transkrip.sinkron` | SERVICE | `service` | `subject.id = service-nilai` | `SERVICE_ONLY` |

Role di luar kolom Role → `ROLE_NOT_ALLOWED`. Tipe subjek salah (user di endpoint service, atau service di endpoint user) → `SERVICE_ONLY` atau `TOKEN_TYPE_INVALID`.

Semua keputusan DENY dari engine → HTTP **403**. Kegagalan token → **401** (dicatat oleh `authenticate`).

## 3. Konteks (bagian 4.3)

**Device** (`checks/device.check.js`)
- Hanya untuk subjek USER. Header `X-Device-ID` wajib; harus ada baris `devices (userId, deviceId)`.
- Reason: `DEVICE_HEADER_MISSING`, `DEVICE_NOT_REGISTERED`.
- Token service tidak butuh device.

**Jam akses** (`checks/access-hours.check.js`)
- Berlaku untuk `nilai.update` dan `kelas.finalisasi`.
- Env: `ACCESS_HOURS_START=7`, `ACCESS_HOURS_END=21`, `ACCESS_TIMEZONE=Asia/Jakarta`.
- Aturan: `START <= jam < END` (21:00:00 sudah ditolak). `END=24` berarti sampai tengah malam.
- Jam dihitung dengan `Intl.DateTimeFormat` pada zona waktu env, bukan jam server (container berjalan UTC).
- Demo: `0`–`24` = selalu boleh; `1`–`2` = hampir selalu ditolak. Ubah `.env` lalu `docker compose up -d gateway`.

## 4. Daftar reason code

| Kode | Sumber | HTTP |
|---|---|---|
| `TOKEN_MISSING`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_TYPE_INVALID` | authenticate | 401 |
| `LOGIN_INVALID_CREDENTIALS`, `SERVICE_CLIENT_INVALID` | auth | 401 |
| `REFRESH_INVALID`, `REFRESH_REVOKED`, `REFRESH_EXPIRED` | auth | 401 |
| `USER_INACTIVE` | auth/authenticate | 403 |
| `DEVICE_HEADER_MISSING`, `DEVICE_NOT_REGISTERED` | device.check | 403 |
| `ROLE_NOT_ALLOWED`, `SERVICE_ONLY` | engine | 403 |
| `NOT_OWNER`, `CLASS_NOT_OWNED`, `RESOURCE_NOT_FOUND` | rules | 403 |
| `NILAI_ALREADY_FINAL` | rules | 403 |
| `OUTSIDE_ACCESS_HOURS` | access-hours.check | 403 |
| `ROUTE_NOT_ALLOWED` | not-found | 403 |
| `ALLOWED` | engine (alasan untuk ALLOW) | — |

Daftar dipusatkan di `policy/reasons.js` (objek konstanta) agar tidak ada string liar.

## 5. Pertahanan berlapis (service tidak percaya gateway begitu saja)

Gateway mengambil keputusan penuh. Service tetap melakukan:

| Lapis | Service Nilai | Service Transkrip |
|---|---|---|
| 1. `X-Gateway-Secret` benar (perbandingan `crypto.timingSafeEqual`) | ya → 403 | ya → 403 |
| 2. Token valid: tanda tangan, `exp`, `iss`, `type` | ya → 401 | ya → 401 |
| 3. Role sesuai endpoint | ya (`require-role`) | ya; `/sinkron` hanya `service` |
| 4. Scoping data dari `sub` token | mahasiswa: hanya miliknya & FINAL; dosen: hanya `kelas.dosenId = sub` | mahasiswa: NIM milik `sub` |

Urutan di service: secret → token → role → controller. Request dengan secret benar tetapi tanpa token ditolak 401.

## 6. Pemetaan prinsip zero trust

| Prinsip | Wujud di sistem |
|---|---|
| Never trust, always verify | Setiap request diverifikasi di gateway **dan** di service; panggilan antar-service juga lewat gateway |
| Least privilege | Rule per endpoint; scoping data per `sub`; token service hanya bisa `/transkrip/sinkron`; token berumur pendek |
| Assume breach | Service tidak bisa diakses langsung; token dicabut via refresh token di DB; audit semua keputusan; default deny |
| Verifikasi konteks | Device terdaftar + jam akses |

## 7. Skenario assume-breach

| Skenario | Mitigasi | Sisa risiko |
|---|---|---|
| Penyerang menembak service langsung dari dalam jaringan | Butuh `X-Gateway-Secret` **dan** token valid | Jika secret bocor, tetap butuh token sah |
| Access token user dicuri | Umur 10 menit; device harus terdaftar milik `sub` | Dalam 10 menit dan dari device terdaftar masih sah |
| Refresh token dicuri/dipakai ulang | Disimpan hash, dirotasi; token lama langsung `revokedAt`; logout mencabut | Pencuri yang refresh lebih dulu mendapat token baru |
| Klien memalsukan `X-Gateway-Secret` | Gateway membuang header dari klien dan menimpa dengan miliknya | — |
| IDOR (menebak ID kelas/nilai/NIM) | Pengecekan kepemilikan di Policy Engine + scoping di service | — |
| Akun dosen dipakai tengah malam | Jam akses menolak ubah/finalisasi | Aksi baca tetap boleh |
| Service Nilai dibobol dan memalsukan token | **Tidak tertutup di HS256** karena service memegang `JWT_SECRET` | Upgrade RS256 (Fase 8) menutupnya |
| Token user dipakai ke `/transkrip/sinkron` | Rule `SERVICE_ONLY` + klaim `type` | — |
| Brute force login | Opsional rate limit (Fase 8); pesan error generik | — |
