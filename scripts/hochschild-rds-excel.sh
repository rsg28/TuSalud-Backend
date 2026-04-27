#!/usr/bin/env bash
# Desde cualquier directorio: genera siempre
#   <raíz backend>/datos_hochschild_rds_60.xlsx
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node scripts/generarExcelHochschildDesdeRds.js
echo "→ $ROOT/datos_hochschild_rds_60.xlsx"
