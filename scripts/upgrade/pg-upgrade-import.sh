#!/usr/bin/env bash
export LC_ALL=C
# Paso 2 de 2 de la actualización automática PostgreSQL 13 -> 17 (servicio
# pg-upgrade-import de docker-compose.yml). Corre con la imagen postgres:17
# cuando la base de datos 17 ya está en marcha, y ANTES que el backend: si
# falla, el backend no arranca (depends_on: service_completed_successfully).
#
# Restaura la copia del paso 1 (pending.dump) y comprueba, tabla a tabla, que
# hay las mismas filas que en la copia. Si todo coincide la guarda con fecha
# y deja la marca .migrado: a partir de ahí los dos pasos no hacen nada.
set -euo pipefail

UPGRADE_DIR=/backups/pre-upgrade
PENDING="$UPGRADE_DIR/pending.dump"
export PGHOST=postgres PGUSER="${DB_USER:?falta DB_USER}" PGDATABASE="${DB_NAME:?falta DB_NAME}" PGPASSWORD="${DB_PASSWORD:-}"

log() { echo "[pg-upgrade-import] $*"; }

if [ ! -f "$PENDING" ]; then
  log "Nada que importar."
  exit 0
fi

q() { psql -v ON_ERROR_STOP=1 -tA -c "$1"; }

# Filas de cada tabla de public, "tabla|filas" ordenado
COUNT_SQL="SELECT table_name || '|' || (xpath('/row/c/text()',
  query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name;"

# Si la 17 ya tiene datos no se toca nada (alguien lo restauró a mano, o se
# borró la marca .migrado): se deja la copia y se marca como hecho.
TABLES=$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
if [ "$TABLES" -gt 0 ]; then
  ROWS=$(q "$COUNT_SQL" | awk -F'|' '{s += $2} END {print s + 0}')
  if [ "$ROWS" -gt 0 ]; then
    log "PostgreSQL 17 ya tiene datos ($ROWS filas): no se restaura nada."
    mv "$PENDING" "$UPGRADE_DIR/sin_usar_$(date +%Y%m%d_%H%M%S).dump"
    touch "$UPGRADE_DIR/.migrado"
    exit 0
  fi
  # Tablas creadas pero vacías: se vacía el esquema para restaurar limpio.
  log "PostgreSQL 17 tiene tablas vacías: se recrean desde la copia."
  q "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
fi

log "Restaurando la copia de PostgreSQL 13..."
pg_restore --no-owner --exit-on-error -d "$PGDATABASE" "$PENDING"

# Filas por tabla según la copia: cada bloque COPY ... FROM stdin; lleva una
# línea por fila hasta "\." (los saltos de línea de los datos van escapados).
EXPECTED=$(pg_restore --data-only -f - "$PENDING" | awk '
  /^COPY / { split($2, p, "."); t = p[2]; gsub(/"/, "", t); n = 0; inside = 1; next }
  inside && $0 == "\\." { print t "|" n; inside = 0; next }
  inside { n++ }
' | sort)
ACTUAL=$(q "$COUNT_SQL" | sort)

# Solo las tablas que tienen datos en la copia; las demás deben estar vacías
DIFFS=$(join -t'|' -a1 -e MISSING -o 0,1.2,2.2 <(echo "$EXPECTED") <(echo "$ACTUAL") | awk -F'|' '$2 != $3')
if [ -n "$DIFFS" ]; then
  log "ERROR: las filas no coinciden (tabla|copia|restaurado):"
  echo "$DIFFS" | sed 's/^/    /'
  log "El backend NO se arranca. Los datos de PostgreSQL 13 siguen intactos."
  exit 1
fi

TOTAL=$(echo "$EXPECTED" | awk -F'|' '{s += $2} END {print s + 0}')
FINAL="$UPGRADE_DIR/$(date +%Y%m%d_%H%M%S)_${PGDATABASE}_pg13.dump"
mv "$PENDING" "$FINAL"
touch "$UPGRADE_DIR/.migrado"
log "Actualizado a PostgreSQL $(q 'SHOW server_version;' | cut -d' ' -f1): $(echo "$EXPECTED" | grep -c .) tablas, $TOTAL filas, todo coincide."
log "Copia de la versión 13: $FINAL"
