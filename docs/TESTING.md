# TESTING — Skenario Uji Manual (curl) & Smoke Test

Dipakai untuk memastikan setiap kebutuhan bekerja, dan sebagai bahan demo. Implementasikan ulang sebagai `scripts/smoke-test.sh`.

## 1. Persiapan

```bash
docker compose down -v && docker compose up --build -d
export GW=http://localhost:3000
```

Helper login (simpan token ke variabel):

```bash
login() { # $1=email $2=device
  curl -s -X POST $GW/auth/login -H 'Content-Type: application/json' -H "X-Device-ID: $2" \
    -d "{\"email\":\"$1\",\"password\":\"Password123!\"}"
}
DOSEN1=$(login dosen1@unsil.test DOSEN1-LAPTOP-01 | jq -r .data.accessToken)
DOSEN2=$(login dosen2@unsil.test DOSEN2-LAPTOP-01 | jq -r .data.accessToken)
MHS1=$(login mhs1@unsil.test MHS1-HP-01 | jq -r .data.accessToken)
ADMIN=$(login admin@unsil.test ADMIN-LAPTOP-01 | jq -r .data.accessToken)
```

Ambil ID yang dibutuhkan (kelas A = `IF301-A`, kelas B = `IF302-A`):

```bash
curl -s $GW/nilai -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01' | jq
# catat: KELAS_A_ID, NILAI_A_MHS1_ID. Ulangi dengan DOSEN2 untuk KELAS_B_ID, NILAI_B_ID
```

Pola request user: `-H "Authorization: Bearer $TOKEN" -H "X-Device-ID: <device>"`.

## 2. Matriks uji

| ID | Skenario | Ekspektasi | Reason (audit) |
|---|---|---|---|
| **T01** | Login dosen1 + device benar | 200, ada access & refresh token | `ALLOWED` |
| **T02** | Login dengan device tak terdaftar | 403 | `DEVICE_NOT_REGISTERED` |
| **T03** | Login tanpa `X-Device-ID` | 403 | `DEVICE_HEADER_MISSING` |
| **T04** | Login password salah | 401 (pesan generik) | `LOGIN_INVALID_CREDENTIALS` |
| **T05** | Refresh sukses; pakai refresh token lama lagi | 200 lalu 401 | `REFRESH_REVOKED` |
| **T06** | Logout, lalu refresh dengan token tsb | 200 lalu 401 | `REFRESH_REVOKED` |
| **T07** | Access token kedaluwarsa (set `JWT_ACCESS_EXPIRES_IN=5s`, tunggu) | 401 | `TOKEN_EXPIRED` |
| **T08** | `POST /auth/service` secret benar / salah | 200 role service / 401 | `SERVICE_CLIENT_INVALID` |
| **T09** | `GET /nilai` tanpa token | 401 | `TOKEN_MISSING` |
| **T10** | Token valid tetapi `X-Device-ID` milik user lain | 403 | `DEVICE_NOT_REGISTERED` |
| **T11** | mhs1 `GET /nilai` sebelum finalisasi | 200, daftar kosong (draft tersembunyi); setelah T19 berisi nilai FINAL miliknya saja | `ALLOWED` |
| **T12** | mhs1 `GET /nilai?nim=247006111002` | 403 | `NOT_OWNER` |
| **T13** | dosen1 `GET /nilai?kelasId=<A>` → 200; `?kelasId=<B>` → 403 | 200 / 403 | `CLASS_NOT_OWNED` |
| **T14** | dosen1 `GET /nilai` tanpa kelasId | 200, hanya kelas A | `ALLOWED` |
| **T15** | mhs1 `PUT /nilai/<id>` | 403 | `ROLE_NOT_ALLOWED` |
| **T16** | dosen2 `PUT /nilai/<nilai kelas A>` | 403 | `CLASS_NOT_OWNED` |
| **T17** | dosen1 `PUT /nilai/<nilai kelas A>` `{"score":91.5}` dalam jam akses | 200 | `ALLOWED` |
| **T18** | Ulangi T17 dengan jam akses diubah (`ACCESS_HOURS_START=1`, `END=2`) | 403 | `OUTSIDE_ACCESS_HOURS` |
| **T19** | dosen1 `POST /kelas/<A>/finalisasi` dalam jam akses | 200, `transkripTersinkron: true` | `ALLOWED` |
| **T20** | dosen1 `PUT` nilai yang sudah FINAL | 403 | `NILAI_ALREADY_FINAL` |
| **T21** | Finalisasi kelas A kedua kali | 409 `KELAS_SUDAH_FINAL` | `ALLOWED` (ditolak di service) |
| **T22** | mhs1 `GET /transkrip/247006111001` → 200; `/247006111002` → 403 | 200 / 403 | `NOT_OWNER` |
| **T23** | admin `GET /transkrip/<semua NIM>` → 200; dosen1 `GET /transkrip/...` → 403 | 200 / 403 | `ROLE_NOT_ALLOWED` |
| **T24** | admin & dosen1 `POST /transkrip/sinkron` (token user) | 403 | `SERVICE_ONLY` |
| **T25** | Akses langsung ke service (pakai `docker-compose.demo.yml`): a) tanpa secret, b) secret benar tanpa token, c) secret benar + token palsu | a) 403, b) 401, c) 401 | (tidak lewat gateway, tidak ada audit) |
| **T26** | Token service dipakai ke `GET /nilai` | 403 | `TOKEN_TYPE_INVALID` |
| **T27** | Periksa audit log: semua T di atas tercatat dengan waktu, subjek, endpoint, device, hasil, alasan | semua baris ada | — |
| **T28** | Route tak dikenal (`GET /admin`), serta kirim header `X-Gateway-Secret: palsu` ke route sah | 403 `ROUTE_NOT_ALLOWED`; secret palsu diabaikan | `ROUTE_NOT_ALLOWED` |
| **T29** | Finalisasi kelas B saat ada nilai kosong (kosongkan salah satu via DB) | 422 `NILAI_KOSONG` | `ALLOWED` |
| **T30** | Sinkron gagal (matikan `service-transkrip`, finalisasi kelas B) lalu nyalakan, finalisasi ulang | 502 lalu 200 | `ALLOWED` |

## 3. Perintah untuk T25 (akses langsung)

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d
curl -i localhost:3001/nilai                                              # a) 403
curl -i localhost:3001/nilai -H "X-Gateway-Secret: $GATEWAY_SECRET"       # b) 401
curl -i localhost:3001/nilai -H "X-Gateway-Secret: $GATEWAY_SECRET" -H "Authorization: Bearer palsu"  # c) 401
```

## 4. Melihat audit log

```bash
docker compose exec mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" nilai_db \
  -e "SELECT created_at, subject_type, subject_id, role, method, endpoint, device_id, decision, reason FROM audit_logs ORDER BY id DESC LIMIT 20;"
```
`scripts/show-audit.sh` membungkus perintah ini.

## 5. Kriteria lulus

Semua T01–T30 sesuai ekspektasi pada instalasi bersih, dan `smoke-test.sh` keluar dengan kode 0.
