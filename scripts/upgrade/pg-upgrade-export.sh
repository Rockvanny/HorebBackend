#!/usr/bin/env bash
# Paso 1 de 2 de la actualización automática PostgreSQL 13 -> 17 (servicio
# pg-upgrade-export de docker-compose.yml; el paso 2 es pg-upgrade-import.sh).
# Corre con la imagen postgres:13 y el volumen viejo (pgdata_vol) montado en
# solo lectura.
#
# Saca una copia de los datos de la 13 a $UPGRADE_DIR/pending.dump para que
# el paso 2 la restaure en la 17. No borra ni modifica nada.
#
# En cada `docker compose up` termina en segundos si no hay nada que hacer:
# ya migrado (marca .migrado), instalación nueva (volumen viejo vacío) o
# copia pendiente de importar de un intento anterior.
set -euo pipefail

UPGRADE_DIR=/backups/pre-upgrade
OLD_DATA=/var/lib/postgresql/data
DB="${DB_NAME:?falta DB_NAME}"
USER_NAME="${DB_USER:?falta DB_USER}"

log() { echo "[pg-upgrade-export] $*"; }

if [ -f "$UPGRADE_DIR/.migrado" ]; then
  log "Ya actualizado a PostgreSQL 17: nada que hacer."
  exit 0
fi
if [ ! -f "$OLD_DATA/PG_VERSION" ]; then
  log "No hay datos de PostgreSQL 13 (instalación nueva): nada que hacer."
  exit 0
fi
if [ -f "$UPGRADE_DIR/pending.dump" ]; then
  log "Ya hay una copia pendiente de importar: se usa esa."
  exit 0
fi

mkdir -p "$UPGRADE_DIR"
TMP_DUMP="$UPGRADE_DIR/.pending.dump.tmp"
rm -f "$TMP_DUMP"

# Lee los datos con el servidor que corresponda:
#  - El PostgreSQL 13 de siempre sigue en marcha (`docker compose up` sobre
#    una instalación funcionando: Docker lo sustituye DESPUÉS de este paso):
#    copia por red. Nunca se arranca un segundo servidor sobre sus archivos.
#  - Está parado (`docker compose down` antes, o equipo recién encendido):
#    se arranca aquí un 13 temporal, solo con socket local, sobre una copia
#    del directorio (el volumen está montado en solo lectura).
export PGPASSWORD="${DB_PASSWORD:-}"
if pg_isready -q -h postgres -U "$USER_NAME" -d "$DB" 2>/dev/null \
   && [ "$(psql -h postgres -U "$USER_NAME" -d "$DB" -tAc 'SHOW server_version_num')" -lt 140000 ]; then
  log "Copiando desde el PostgreSQL 13 en marcha."
  pg_dump -h postgres -U "$USER_NAME" -d "$DB" -Fc -f "$TMP_DUMP"
elif [ ! -f "$OLD_DATA/postmaster.pid" ]; then
  log "PostgreSQL 13 parado: arrancando uno temporal para leer los datos."
  WORK=/tmp/pg13data
  cp -a "$OLD_DATA" "$WORK"
  chown -R postgres:postgres "$WORK"
  gosu postgres pg_ctl -D "$WORK" -w -t 120 -l /tmp/pg13.log \
    -o "-c listen_addresses='' -c unix_socket_directories=/tmp" start >/dev/null
  trap 'gosu postgres pg_ctl -D /tmp/pg13data -m fast stop >/dev/null 2>&1 || true' EXIT
  gosu postgres pg_dump -h /tmp -U "$USER_NAME" -d "$DB" -Fc -f /tmp/pending.dump
  cp /tmp/pending.dump "$TMP_DUMP"
else
  log "ERROR: los datos de PostgreSQL 13 están en uso pero el servidor no responde."
  log "Para la aplicación (docker compose down) y vuelve a ejecutar docker compose up."
  exit 1
fi

pg_restore --list "$TMP_DUMP" >/dev/null
mv "$TMP_DUMP" "$UPGRADE_DIR/pending.dump"
log "Copia lista ($(du -h "$UPGRADE_DIR/pending.dump" | cut -f1))."
