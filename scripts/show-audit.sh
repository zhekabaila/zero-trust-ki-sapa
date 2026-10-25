#!/usr/bin/env bash
# Util demo: menampilkan 20 keputusan terakhir dari tabel audit_logs (kebutuhan 4.4).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" nilai_db -e \
  "SELECT created_at, subject_type, subject_id, role, method, endpoint, device_id, decision, reason FROM audit_logs ORDER BY id DESC LIMIT 20;"
