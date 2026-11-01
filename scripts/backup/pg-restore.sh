#!/bin/bash
# Restaura la base de datos desde una copia de /backups. Se ejecuta dentro del
# contenedor `backup`, así funciona igual con host Windows o Linux:
#
#   docker compose stop backend
#   docker compose exec backup bash /usr/local/bin/pg-restore.sh                     # última copia diaria
#   docker compose exec backup bash /usr/local/bin/pg-restore.sh monthly/Horeb_X.dump # una concreta
#   docker compose start backend
#
# Antes de tocar nada guarda el estado actual en /backups/pre-restore/, por si
# la copia elegida no era la buena.
set -euo pipefail

BACKUP_ROOT=/backups

if [ $# -ge 1 ]; then
  src="$1"
  [ -f "$src" ] || src="$BACKUP_ROOT/$1"
else
  src="$(ls -1t "$BACKUP_ROOT"/daily/*.dump 2>/dev/null | head -n 1 || true)"
fi

if [ -z "${src:-}" ] || [ ! -f "$src" ]; then
  echo "No se encuentra la copia '${1:-daily/*.dump}' en $BACKUP_ROOT" >&2
  exit 1
fi

pg_restore --list "$src" >/dev/null || { echo "El fichero $src no es un dump válido" >&2; exit 1; }

echo "Se va a REEMPLAZAR la base de datos '$PGDATABASE' con:"
echo "  $src"
read -r -p "Escribe RESTAURAR para continuar: " answer
[ "$answer" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

mkdir -p "$BACKUP_ROOT/pre-restore"
safety="$BACKUP_ROOT/pre-restore/${PGDATABASE}_$(date '+%Y%m%d_%H%M%S').dump"
echo "Guardando el estado actual en $safety ..."
pg_dump -Fc -f "$safety"

echo "Recreando la base de datos..."
psql -d postgres -v ON_ERROR_STOP=1 -q <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
 WHERE datname = '$PGDATABASE' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "$PGDATABASE";
CREATE DATABASE "$PGDATABASE" OWNER "$PGUSER";
SQL

echo "Restaurando..."
pg_restore --no-owner --role="$PGUSER" -d "$PGDATABASE" "$src"

echo "Restauración completada. Arranca el backend: docker compose start backend"
