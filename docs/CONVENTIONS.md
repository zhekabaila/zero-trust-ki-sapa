# CONVENTIONS — Gaya Kode yang Mudah Dipelajari

Tujuan: kode bisa dibaca dan dijelaskan oleh pemula backend. **Jelas lebih penting daripada ringkas.**

## 1. Aturan umum

1. JavaScript ESM (`import`/`export`), Node 22, Express 5. Tanpa TypeScript, tanpa library "ajaib".
2. Satu berkas = satu tanggung jawab. Nama: `<nama>.<lapisan>.js` (`nilai.service.js`, `user.repository.js`).
3. Folder dan berkas pakai `kebab-case`; fungsi/variabel `camelCase`; konstanta `UPPER_SNAKE_CASE`; kelas `PascalCase`.
4. Fungsi pendek (idealnya < 30 baris). Hindari nesting lebih dari 3 tingkat; pakai *early return*.
5. **Komentar berbahasa Indonesia yang menjelaskan "kenapa"**, bukan "apa". Setiap berkas diawali komentar 1–3 baris tentang fungsinya dan kaitannya dengan kebutuhan soal (cth. `// Kebutuhan 4.1: verifikasi ulang token di service`).
6. Tidak ada angka/string ajaib. Pindahkan ke `config/env.js` atau konstanta bernama.
7. Hanya `repositories/` yang mengimpor `lib/prisma.js`.
8. Secret hanya dari env. Tidak pernah di-log, tidak pernah di-commit.
9. Express 5: handler `async` boleh melempar error langsung; `error-handler.middleware.js` yang menangkap. Jangan bungkus try/catch kecuali untuk mengubah error.

## 2. Alur satu request (contoh `PUT /nilai/:id` di Service Nilai)

```js
// routes/nilai.routes.js — hanya peta URL → handler
router.put('/:id', requireRole('DOSEN'), validate(updateNilaiSchema), nilaiController.update);
```

```js
// controllers/nilai.controller.js — urusan HTTP saja
export async function update(req, res) {
  const nilai = await nilaiService.updateScore({
    nilaiId: req.params.id,
    score: req.body.score,
    dosenId: req.token.sub,
  });
  res.json(ok(nilai));
}
```

```js
// services/nilai.service.js — aturan bisnis
export async function updateScore({ nilaiId, score, dosenId }) {
  const nilai = await nilaiRepository.findByIdWithKelas(nilaiId);
  if (!nilai) throw new AppError(404, 'NILAI_NOT_FOUND', 'Nilai tidak ditemukan');
  if (nilai.kelas.dosenId !== dosenId) throw new AppError(403, 'CLASS_NOT_OWNED', 'Bukan kelas Anda');
  if (nilai.status === 'FINAL') throw new AppError(403, 'NILAI_ALREADY_FINAL', 'Nilai sudah final');
  return nilaiRepository.updateScore(nilaiId, score);
}
```

```js
// repositories/nilai.repository.js — satu-satunya tempat Prisma
export function updateScore(id, score) {
  return prisma.nilai.update({ where: { id }, data: { score } });
}
```

## 3. Error & respons

```js
// lib/errors.js
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
```

```js
// lib/response.js
export const ok = (data) => ({ success: true, data });
export const fail = (code, message) => ({ success: false, error: { code, message } });
```

- Lempar `AppError` dari service/middleware. `error-handler` mengubahnya menjadi `fail(...)` dengan status yang sesuai.
- Error tak terduga → 500 `INTERNAL_ERROR` tanpa detail; detail hanya ke log server.

## 4. Validasi (zod)

```js
// validators/nilai.validator.js
export const updateNilaiSchema = z.object({
  score: z.number().min(0).max(100),
});
```
`validate.middleware.js` memvalidasi `req.body` dan mengganti dengan hasil parse. Gagal → 400 `VALIDATION_ERROR`.

## 5. Config

`config/env.js` membaca `process.env` **sekali**, memvalidasi (proses berhenti dengan pesan jelas jika env wajib hilang), lalu mengekspor objek `env`. Tidak ada `process.env` di berkas lain.

## 6. Logging

- `console.log` terstruktur sederhana: `[gateway] [req-id] pesan`.
- Jangan log password, token, secret, hash.
- Audit log adalah tabel database, bukan console.

## 7. Git

- Commit kecil per tugas fase; pesan bahasa Indonesia atau Inggris, konsisten: `feat(gateway): tambah login`.
- `.env` tidak masuk git; `.env.example` wajib selalu mutakhir.

## 8. Checklist sebelum commit

- [ ] Berjalan lewat `docker compose up --build`
- [ ] Tidak ada `prisma` di luar `repositories/` dan `database/`
- [ ] Setiap berkas baru punya komentar pembuka
- [ ] Kontrak berubah → `docs/API.md` / `POLICY.md` ikut diperbarui
- [ ] Uji terkait di `TESTING.md` lulus
