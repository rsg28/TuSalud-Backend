#!/usr/bin/env bash
# Ejecutar EN LA EC2 (donde el security group de RDS permite el tráfico).
# Uso:
#   cd ~/TuSalud-Backend   # o la ruta del repo en el servidor
#   bash scripts/run_whatsapp_migrations.sh

set -euo pipefail

HOST="${DB_HOST:-tusaluddb.cwt2imwkyevt.us-east-1.rds.amazonaws.com}"
PORT="${DB_PORT:-3306}"
USER="${DB_USER:-admin}"
DB="${DB_NAME:-tusalud}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${DB_PASSWORD:-}" ]]; then
  if [[ -f "${SCRIPT_DIR}/../.env" ]]; then
    # shellcheck disable=SC1091
    DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "${SCRIPT_DIR}/../.env" | head -1 | cut -d= -f2- | tr -d "'\"")"
  fi
fi

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "Define DB_PASSWORD en el entorno o en .env"
  exit 1
fi

MYSQL=(mysql -h "$HOST" -P "$PORT" -u "$USER" -p"$DB_PASSWORD" "$DB")

run_file() {
  local f="$1"
  echo "==> $f"
  "${MYSQL[@]}" < "$f" && echo "    OK" || {
    echo "    (si falla por columna/tabla duplicada, puede que ya esté aplicada)"
    return 0
  }
}

export MYSQL_PWD="$DB_PASSWORD"

run_file "${SCRIPT_DIR}/migration_whatsapp_aprobaciones.sql"
run_file "${SCRIPT_DIR}/migration_whatsapp_sms_fallback.sql"
run_file "${SCRIPT_DIR}/migration_add_historial_whatsapp_enviada.sql"

echo ""
echo "Verificación:"
"${MYSQL[@]}" -e "SHOW TABLES LIKE 'whatsapp_aprobaciones';"
"${MYSQL[@]}" -e "SHOW COLUMNS FROM historial_pedido LIKE 'tipo_evento';"

unset MYSQL_PWD
echo "Listo."
