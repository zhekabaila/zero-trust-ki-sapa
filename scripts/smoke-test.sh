#!/usr/bin/env bash
# Fase 6: menjalankan semua skenario TESTING.md (T01-T30) terhadap stack yang SEDANG BERJALAN.
# Persiapan yang disarankan (instalasi bersih):
#   docker compose down -v && docker compose up --build -d && scripts/smoke-test.sh
# Catatan: script mengubah ACCESS_HOURS di .env sementara (T17/T18/T30) lalu mengembalikannya.
set -uo pipefail
cd "$(dirname "$0")/.."

GW=http://localhost:3000
BODY=/tmp/smoke-body.json
PASS=0; FAIL=0

set -a; source .env; set +a

check() { # $1=id $2=expected $3=actual
  if [ "$2" = "$3" ]; then echo "ok   $1 ($3)"; PASS=$((PASS+1));
  else echo "GAGAL $1: butuh=$2 dapat=$3"; FAIL=$((FAIL+1)); fi
}

# Baca JSON tanpa eval: hanya menelusuri path literal (mis. .data[0].kelasId).
jsonget() {
  node -e '
let b = "";
process.stdin.on("data", (d) => (b += d)).on("end", () => {
  let v;
  try { v = JSON.parse(b); } catch { console.log(""); return; }
  for (const t of process.argv[1].match(/\.[^.[\]]+|\[\d+\]/g) || []) {
    v = t.startsWith("[") ? v?.[Number(t.slice(1, -1))] : v?.[t.slice(1)];
    if (v === undefined) { console.log(""); return; }
  }
  console.log(typeof v === "boolean" ? (v ? "true" : "false") : v);
});' "$1"
}

# Tulis .env dengan ACCESS_HOURS baru (portabel, tanpa sed -i yang beda antar-OS).
set_hours() { # $1=start $2=end
  grep -v -E '^ACCESS_HOURS_(START|END)=' .env > .env.tmp
  printf 'ACCESS_HOURS_START=%s\nACCESS_HOURS_END=%s\n' "$1" "$2" >> .env.tmp
  mv .env.tmp .env
  docker compose up -d --force-recreate gateway >/dev/null 2>&1
  wait_gw
}

httpcode() { curl -s -o "$BODY" -w '%{http_code}' "$@"; }
reason() { jsonget .error.code < "$BODY"; }

# $1=id $2=status diharapkan $3=reason diharapkan ('' = bebas) $4...=argumen curl
expect() { local id=$1 es=$2 er=$3; shift 3
  local c r; c=$(httpcode "$@"); r=$(reason)
  if [ "$es" = "$c" ] && { [ -z "$er" ] || [ "$er" = "$r" ]; }; then
    echo "ok   $id ($c $r)"; PASS=$((PASS+1))
  else
    echo "GAGAL $id: butuh=$es/${er:-?} dapat=$c/$r"; FAIL=$((FAIL+1))
  fi
}

login() { curl -s -X POST $GW/auth/login -H 'Content-Type: application/json' -H "X-Device-ID: $2" \
  -d "{\"email\":\"$1\",\"password\":\"Password123!\"}"; }
token_of() { login "$1" "$2" | jsonget .data.accessToken; }
mysqlq() { docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" nilai_db -N -e "$1" 2>/dev/null; }

# Menunggu dengan polling (bukan sleep tetap): container yang baru dibuat ulang bisa butuh waktu berbeda.
wait_gw() { for _ in $(seq 1 40); do curl -sf $GW/health >/dev/null 2>&1 && return 0; sleep 1; done; echo "GAGAL: gateway tidak siap"; return 1; }
wait_transkrip() { for _ in $(seq 1 40); do docker compose exec -T service-transkrip node healthcheck.js 3002 >/dev/null 2>&1 && return 0; sleep 1; done; echo "GAGAL: service-transkrip tidak siap"; return 1; }

echo "== menunggu gateway =="
wait_gw

ORIG_START=$(grep '^ACCESS_HOURS_START=' .env | cut -d= -f2)
ORIG_END=$(grep '^ACCESS_HOURS_END=' .env | cut -d= -f2)
trap 'set_hours "$ORIG_START" "$ORIG_END" >/dev/null 2>&1' EXIT
set_hours 0 24

echo "== T01-T08 auth =="
R1=$(login dosen1@unsil.test DOSEN1-LAPTOP-01)
check T01 true "$(jsonget .success <<< "$R1")"
DOSEN1=$(jsonget .data.accessToken <<< "$R1")
expect T02 403 DEVICE_NOT_REGISTERED -X POST $GW/auth/login -H 'Content-Type: application/json' -H 'X-Device-ID: PENCURIAN' -d '{"email":"dosen1@unsil.test","password":"Password123!"}'
expect T03 403 DEVICE_HEADER_MISSING -X POST $GW/auth/login -H 'Content-Type: application/json' -d '{"email":"dosen1@unsil.test","password":"Password123!"}'
expect T04 401 LOGIN_INVALID_CREDENTIALS -X POST $GW/auth/login -H 'Content-Type: application/json' -H 'X-Device-ID: DOSEN1-LAPTOP-01' -d '{"email":"dosen1@unsil.test","password":"salah"}'

RT=$(login mhs1@unsil.test MHS1-HP-01 | jsonget .data.refreshToken)
check T05a 200 "$(httpcode -X POST $GW/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$RT\"}")"
expect T05b 401 REFRESH_REVOKED -X POST $GW/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$RT\"}"
RT2=$(login mhs2@unsil.test MHS2-HP-01 | jsonget .data.refreshToken)
check T06a 200 "$(httpcode -X POST $GW/auth/logout -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$RT2\"}")"
expect T06b 401 REFRESH_REVOKED -X POST $GW/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$RT2\"}"

EXPTOK=$(docker compose exec gateway node -e 'const j=require("jsonwebtoken");console.log(j.sign({sub:"x",role:"DOSEN",type:"access"},process.env.JWT_SECRET,{expiresIn:-10,issuer:process.env.JWT_ISSUER}))' | tr -d '\r')
expect T07 401 TOKEN_EXPIRED $GW/nilai -H "Authorization: Bearer $EXPTOK" -H 'X-Device-ID: DOSEN1-LAPTOP-01'
ST=$(curl -s -X POST $GW/auth/service -H 'Content-Type: application/json' -d "{\"clientId\":\"$SERVICE_NILAI_CLIENT_ID\",\"clientSecret\":\"$SERVICE_NILAI_CLIENT_SECRET\"}")
check T08a 300 "$(jsonget .data.expiresIn <<< "$ST")"
expect T08b 401 SERVICE_CLIENT_INVALID -X POST $GW/auth/service -H 'Content-Type: application/json' -d '{"clientId":"service-nilai","clientSecret":"salah"}'
SVC=$(jsonget .data.accessToken <<< "$ST")

echo "== T09-T18 nilai & kebijakan =="
expect T09 401 TOKEN_MISSING $GW/nilai
DOSEN2=$(token_of dosen2@unsil.test DOSEN2-LAPTOP-01)
MHS1=$(token_of mhs1@unsil.test MHS1-HP-01)
ADMIN=$(token_of admin@unsil.test ADMIN-LAPTOP-01)
expect T10 403 DEVICE_NOT_REGISTERED $GW/nilai -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: MHS1-HP-01'

curl -s $GW/nilai -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01' > /tmp/nilai-d1.json
KELAS_A=$(jsonget .data[0].kelasId < /tmp/nilai-d1.json)
NILAI_A1=$(jsonget .data[0].id < /tmp/nilai-d1.json)
curl -s $GW/nilai -H "Authorization: Bearer $DOSEN2" -H 'X-Device-ID: DOSEN2-LAPTOP-01' > /tmp/nilai-d2.json
KELAS_B=$(jsonget .data[0].kelasId < /tmp/nilai-d2.json)
NILAI_B=$(jsonget .data[0].id < /tmp/nilai-d2.json)

expect T11a 200 "" $GW/nilai -H "Authorization: Bearer $MHS1" -H 'X-Device-ID: MHS1-HP-01'
check T11b 0 "$(jsonget .data.length < "$BODY")"
expect T12 403 NOT_OWNER "$GW/nilai?nim=247006111002" -H "Authorization: Bearer $MHS1" -H 'X-Device-ID: MHS1-HP-01'
expect T13a 200 "" "$GW/nilai?kelasId=$KELAS_A" -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01'
expect T13b 403 CLASS_NOT_OWNED "$GW/nilai?kelasId=$KELAS_B" -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01'
check T14 3 "$(jsonget .data.length < /tmp/nilai-d1.json)"
expect T15 403 ROLE_NOT_ALLOWED -X PUT $GW/nilai/$NILAI_A1 -H "Authorization: Bearer $MHS1" -H 'X-Device-ID: MHS1-HP-01' -H 'Content-Type: application/json' -d '{"score":50}'
expect T16 403 CLASS_NOT_OWNED -X PUT $GW/nilai/$NILAI_A1 -H "Authorization: Bearer $DOSEN2" -H 'X-Device-ID: DOSEN2-LAPTOP-01' -H 'Content-Type: application/json' -d '{"score":50}'
expect T17 200 "" -X PUT $GW/nilai/$NILAI_A1 -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01' -H 'Content-Type: application/json' -d '{"score":91.5}'

set_hours 1 2
expect T18 403 OUTSIDE_ACCESS_HOURS -X PUT $GW/nilai/$NILAI_A1 -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01' -H 'Content-Type: application/json' -d '{"score":92}'
set_hours 0 24

echo "== T19-T26 finalisasi, transkrip, akses langsung =="
expect T19a 200 "" -X POST $GW/kelas/$KELAS_A/finalisasi -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01'
check T19b true "$(jsonget .data.transkripTersinkron < "$BODY")"
expect T20 403 NILAI_ALREADY_FINAL -X PUT $GW/nilai/$NILAI_A1 -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01' -H 'Content-Type: application/json' -d '{"score":93}'
expect T21 409 KELAS_SUDAH_FINAL -X POST $GW/kelas/$KELAS_A/finalisasi -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01'
expect T22a 200 "" $GW/transkrip/247006111001 -H "Authorization: Bearer $MHS1" -H 'X-Device-ID: MHS1-HP-01'
IPK=$(jsonget .data.ipk < "$BODY"); [ "${IPK:-0}" != "0" ] && { echo "ok   T22b ipk=$IPK"; PASS=$((PASS+1)); } || { echo "GAGAL T22b ipk=0"; FAIL=$((FAIL+1)); }
expect T22c 403 NOT_OWNER $GW/transkrip/247006111002 -H "Authorization: Bearer $MHS1" -H 'X-Device-ID: MHS1-HP-01'
expect T23a 200 "" $GW/transkrip/247006111003 -H "Authorization: Bearer $ADMIN" -H 'X-Device-ID: ADMIN-LAPTOP-01'
expect T23b 403 ROLE_NOT_ALLOWED $GW/transkrip/247006111001 -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01'
expect T24a 403 SERVICE_ONLY -X POST $GW/transkrip/sinkron -H "Authorization: Bearer $ADMIN" -H 'X-Device-ID: ADMIN-LAPTOP-01' -H 'Content-Type: application/json' -d '{}'
expect T24b 403 SERVICE_ONLY -X POST $GW/transkrip/sinkron -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01' -H 'Content-Type: application/json' -d '{}'

docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d >/dev/null 2>&1; sleep 4
expect T25a 403 GATEWAY_SECRET_INVALID localhost:3001/nilai
expect T25b 401 TOKEN_MISSING localhost:3001/nilai -H "X-Gateway-Secret: $GATEWAY_SECRET"
expect T25c 401 TOKEN_INVALID localhost:3001/nilai -H "X-Gateway-Secret: $GATEWAY_SECRET" -H "Authorization: Bearer token-palsu"
docker compose -f docker-compose.yml up -d >/dev/null 2>&1

expect T26 403 TOKEN_TYPE_INVALID $GW/nilai -H "Authorization: Bearer $SVC"

echo "== T28-T30 default deny, nilai kosong, sinkron gagal =="
expect T28a 403 ROUTE_NOT_ALLOWED $GW/admin
check T28b 200 "$(httpcode $GW/nilai -H "Authorization: Bearer $DOSEN1" -H 'X-Device-ID: DOSEN1-LAPTOP-01' -H 'X-Gateway-Secret: palsuuuu')"

SCORE_B=$(mysqlq "SELECT score FROM nilai WHERE id='$NILAI_B';")
mysqlq "UPDATE nilai SET score=NULL WHERE id='$NILAI_B';"
expect T29 422 NILAI_KOSONG -X POST $GW/kelas/$KELAS_B/finalisasi -H "Authorization: Bearer $DOSEN2" -H 'X-Device-ID: DOSEN2-LAPTOP-01'
mysqlq "UPDATE nilai SET score=$SCORE_B WHERE id='$NILAI_B';"

docker compose stop service-transkrip >/dev/null 2>&1; sleep 2
expect T30a 502 SINKRON_TRANSKRIP_GAGAL -X POST $GW/kelas/$KELAS_B/finalisasi -H "Authorization: Bearer $DOSEN2" -H 'X-Device-ID: DOSEN2-LAPTOP-01'
docker compose start service-transkrip >/dev/null 2>&1; wait_transkrip
expect T30b 200 "" -X POST $GW/kelas/$KELAS_B/finalisasi -H "Authorization: Bearer $DOSEN2" -H 'X-Device-ID: DOSEN2-LAPTOP-01'

echo "== T27 audit: setiap keputusan di atas harus punya barisnya =="
ROWS=$(mysqlq "SELECT COUNT(*) FROM audit_logs;")
echo "   audit_logs kini $ROWS baris"
for rsn in TOKEN_MISSING DEVICE_NOT_REGISTERED OUTSIDE_ACCESS_HOURS CLASS_NOT_OWNED NILAI_ALREADY_FINAL NOT_OWNER ROLE_NOT_ALLOWED SERVICE_ONLY ROUTE_NOT_ALLOWED ALLOWED SERVICE_CLIENT_INVALID REFRESH_REVOKED TOKEN_EXPIRED LOGIN_INVALID_CREDENTIALS DEVICE_HEADER_MISSING; do
  N=$(mysqlq "SELECT COUNT(*) FROM audit_logs WHERE reason='$rsn';")
  [ "${N:-0}" -gt 0 ] && { echo "ok   T27 reason=$rsn ($N)"; PASS=$((PASS+1)); } || { echo "GAGAL T27 reason=$rsn hilang"; FAIL=$((FAIL+1)); }
done

echo "== T11 bagian kedua: mhs1 melihat FINAL setelah sinkron (kelas A + B) =="
expect T11c 200 "" $GW/nilai -H "Authorization: Bearer $MHS1" -H 'X-Device-ID: MHS1-HP-01'
check T11d 2 "$(jsonget .data.length < "$BODY")"

echo; echo "LULUS=$PASS GAGAL=$FAIL"
[ "$FAIL" -eq 0 ]
