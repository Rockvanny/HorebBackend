#!/bin/bash
# Copias de seguridad automáticas de PostgreSQL (servicio `backup` de
# docker-compose.yml).
#
# Escribe en /backups, que es una carpeta del HOST (BACKUP_DIR en .env), no un
# volumen de Docker: así las copias sobreviven a `docker compose down -v`,
# `docker system prune --volumes` o una reinstalación de Docker.
#
# El servidor es un PC de oficina que se apaga o suspende, así que no se
# programa una hora fija esperando que esté encendido: cada minuto se mira si
# ha pasado alguna de las horas de BACKUP_TIMES sin que haya copia posterior,
# y si es así se hace en ese momento. Con el valor por defecto "00:00 16:00":
#   - 00:00 -> la primera vez que el PC está encendido cada día (al arrancar
#              por la mañana o al volver de suspensión).
#   - 16:00 -> a las 16:00, o en cuanto se encienda si a esa hora estaba apagado.
# No se avisa al usuario: pg_dump no bloquea la BD y la app sigue funcionando.
#
# Rotación:
#   daily/    todas las copias de los últimos BACKUP_KEEP_DAILY días con copia
#   weekly/   primera copia de cada semana, últimas BACKUP_KEEP_WEEKLY
#   monthly/  primera copia de cada mes, últimas BACKUP_KEEP_MONTHLY
set -uo pipefail

BACKUP_ROOT=/backups
BACKUP_TIMES="${BACKUP_TIMES:-00:00 16:00}"
KEEP_DAILY="${BACKUP_KEEP_DAILY:-7}"
KEEP_WEEKLY="${BACKUP_KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${BACKUP_KEEP_MONTHLY:-12}"
CHECK_INTERVAL_S=60
RETRY_AFTER_FAILURE_S=300

log() { echo "[backup $(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Deja en $1 solo las $2 copias más recientes.
rotate_by_count() {
  local dir="$1" keep="$2"
  ls -1t "$dir"/*.dump 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do
    rm -f -- "$old" && log "rotación: borrado $(basename "$old")"
  done
}

# Deja en daily/ las copias de los $1 días más recientes en los que hubo copia
# (por días con copia, no por calendario: si el PC pasa dos semanas apagado no
# se borran todas de golpe).
rotate_daily() {
  local keep="$1" day
  ls -1 "$BACKUP_ROOT"/daily/*.dump 2>/dev/null \
    | sed -n 's/.*_\([0-9]\{8\}\)_[0-9]\{6\}\.dump$/\1/p' | sort -u -r \
    | tail -n +"$((keep + 1))" | while read -r day; do
      for old in "$BACKUP_ROOT"/daily/*_"${day}"_*.dump; do
        rm -f -- "$old" && log "rotación: borrado $(basename "$old")"
      done
    done
}

run_backup() {
  local stamp file tmp week month
  stamp="$(date '+%Y%m%d_%H%M%S')"
  file="${PGDATABASE}_${stamp}.dump"
  tmp="$BACKUP_ROOT/daily/.${file}.tmp"

  if ! pg_dump -Fc -f "$tmp"; then
    log "ERROR: pg_dump ha fallado"
    rm -f -- "$tmp"
    return 1
  fi
  # Un dump que pg_restore no sabe leer no es una copia: se descarta.
  if ! pg_restore --list "$tmp" >/dev/null; then
    log "ERROR: el dump generado no es legible, se descarta"
    rm -f -- "$tmp"
    return 1
  fi
  mv -- "$tmp" "$BACKUP_ROOT/daily/$file"
  log "OK: daily/$file ($(du -h "$BACKUP_ROOT/daily/$file" | cut -f1))"

  # Primera copia de la semana/mes, sea el día que sea (el PC puede estar
  # apagado justo el domingo o el día 1).
  week="${PGDATABASE}_$(date +%G)W$(date +%V).dump"
  month="${PGDATABASE}_$(date +%Y%m).dump"
  if [ ! -f "$BACKUP_ROOT/weekly/$week" ]; then
    cp -- "$BACKUP_ROOT/daily/$file" "$BACKUP_ROOT/weekly/$week" && log "copia semanal: weekly/$week"
  fi
  if [ ! -f "$BACKUP_ROOT/monthly/$month" ]; then
    cp -- "$BACKUP_ROOT/daily/$file" "$BACKUP_ROOT/monthly/$month" && log "copia mensual: monthly/$month"
  fi

  rotate_daily "$KEEP_DAILY"
  rotate_by_count "$BACKUP_ROOT/weekly" "$KEEP_WEEKLY"
  rotate_by_count "$BACKUP_ROOT/monthly" "$KEEP_MONTHLY"
}

# Epoch de la copia diaria más reciente (0 si no hay ninguna).
last_backup_epoch() {
  local newest
  newest="$(ls -1t "$BACKUP_ROOT"/daily/*.dump 2>/dev/null | head -n 1)"
  [ -n "$newest" ] && stat -c %Y "$newest" || echo 0
}

# Epoch de la hora programada más reciente que ya ha pasado (hoy o, si aún no
# ha llegado ninguna de hoy, la última de ayer).
latest_due_slot_epoch() {
  local now t slot latest=0
  now="$(date +%s)"
  for t in $BACKUP_TIMES; do
    for day in today yesterday; do
      slot="$(date -d "$day $t" +%s)" || continue
      [ "$slot" -le "$now" ] && [ "$slot" -gt "$latest" ] && latest="$slot"
    done
  done
  echo "$latest"
}

mkdir -p "$BACKUP_ROOT/daily" "$BACKUP_ROOT/weekly" "$BACKUP_ROOT/monthly"
# Restos de un dump cortado por un apagado a mitad de copia.
rm -f -- "$BACKUP_ROOT"/daily/.*.tmp

log "esperando a PostgreSQL en $PGHOST..."
until pg_isready -q; do sleep 2; done
log "activo; horas programadas: $BACKUP_TIMES (con recuperación si el PC estaba apagado)"

# Se compara contra la hora real en cada vuelta en vez de dormir hasta la
# próxima copia: tras una suspensión `sleep` no cuenta el tiempo dormido.
while true; do
  if [ "$(last_backup_epoch)" -lt "$(latest_due_slot_epoch)" ]; then
    if ! pg_isready -q || ! run_backup; then
      log "se reintentará en $((RETRY_AFTER_FAILURE_S / 60)) min"
      sleep "$RETRY_AFTER_FAILURE_S"
      continue
    fi
  fi
  sleep "$CHECK_INTERVAL_S"
done
