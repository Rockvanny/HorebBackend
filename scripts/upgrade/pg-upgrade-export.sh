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
set -Eeuo pipefail

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

# Cualquier fallo inesperado deja dicho dónde y por qué en `docker logs
# pg-upgrade-export` (en producción, 2026-11-16, falló sin que quedara el
# motivo: se borraron los contenedores antes de leer el log)
trap 'log "ERROR inesperado en la línea $LINENO (código $?). Los datos de PostgreSQL 13 no se han modificado."' ERR

PID_FILE="$OLD_DATA/postmaster.pid"
WORK=/tmp/pg13data
export PGPASSWORD="${DB_PASSWORD:-}"

pg13_responds() {
  local version
  pg_isready -q -h postgres -U "$USER_NAME" -d "$DB" 2>/dev/null || return 1
  version=$(psql -h postgres -U "$USER_NAME" -d "$DB" -tAc 'SHOW server_version_num' 2>/dev/null) || return 1
  [ -n "$version" ] && [ "$version" -lt 140000 ]
}

# Arranca un 13 temporal, solo con socket local, sobre una COPIA del
# directorio (el volumen está montado en solo lectura) y saca la copia.
dump_from_copy() {
  cp -a "$OLD_DATA" "$WORK"
  # Marca de un servidor que ya no existe (se paró de golpe): en la copia
  # sobra, y PostgreSQL recupera lo pendiente al arrancar
  rm -f "$WORK/postmaster.pid"
  chown -R postgres:postgres "$WORK"
  if ! gosu postgres pg_ctl -D "$WORK" -w -t 300 -l /tmp/pg13.log \
       -o "-c listen_addresses='' -c unix_socket_directories=/tmp" start >/dev/null; then
    log "ERROR: no arranca el PostgreSQL 13 temporal. Su registro:"
    sed 's/^/    /' /tmp/pg13.log
    exit 1
  fi
  trap 'gosu postgres pg_ctl -D /tmp/pg13data -m fast stop >/dev/null 2>&1 || true' EXIT
  gosu postgres pg_dump -h /tmp -U "$USER_NAME" -d "$DB" -Fc -f /tmp/pending.dump
  cp /tmp/pending.dump "$TMP_DUMP"
}

# `docker compose up` para el PostgreSQL 13 (para sustituirlo por el 17) AL
# MISMO TIEMPO que arranca este paso, no antes: si se le pregunta mientras
# se está apagando, ni responde ni ha soltado sus archivos. Se espera a que
# termine (Docker lo fuerza a los 10 s como mucho).
if [ -f "$PID_FILE" ]; then
  log "Esperando a que el PostgreSQL 13 anterior termine de pararse..."
  for _ in $(seq 1 60); do
    [ -f "$PID_FILE" ] || break
    pg13_responds && break
    sleep 1
  done
fi

if [ ! -f "$PID_FILE" ]; then
  log "PostgreSQL 13 parado: arrancando uno temporal para leer los datos."
  dump_from_copy
elif pg13_responds; then
  # Sigue en marcha y estable (p.ej. este paso lanzado a mano): copia por
  # red, nunca un segundo servidor sobre sus archivos
  log "Copiando desde el PostgreSQL 13 en marcha."
  pg_dump -h postgres -U "$USER_NAME" -d "$DB" -Fc -f "$TMP_DUMP"
else
  # Marca de "en uso" pero nadie responde después de esperar: se paró de
  # golpe. Se lee desde una copia, sin tocar el original.
  log "PostgreSQL 13 se paró sin cerrar bien: se leen los datos desde una copia."
  dump_from_copy
fi

pg_restore --list "$TMP_DUMP" >/dev/null
mv "$TMP_DUMP" "$UPGRADE_DIR/pending.dump"
log "Copia lista ($(du -h "$UPGRADE_DIR/pending.dump" | cut -f1))."
