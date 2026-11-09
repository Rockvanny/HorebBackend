# Horeb · Copias de seguridad

_Para el responsable técnico del equipo servidor · 9 de noviembre de 2026. El personal de oficina no necesita esto: su guía solo dice que, si se pierden datos, dejen de trabajar y avisen._

## Qué se copia y cuándo

El servicio `backup` de `docker-compose.yml` copia la base de datos completa (`pg_dump`, formato custom) **dos veces al día: a las 00:00 y a las 16:00** (hora de Madrid).

El equipo no tiene por qué estar encendido a esas horas. Cada minuto el servicio comprueba si falta la copia de la última hora programada y, si falta, la hace en ese momento. Si el equipo se enciende a las 8:00, la copia de las 00:00 se hace al arrancar Docker. Si una copia falla, se reintenta a los 5 minutos.

Cada copia se comprueba con `pg_restore --list` antes de darla por buena. Un archivo a medias nunca sustituye a una copia válida.

## Dónde están

En la carpeta del **equipo** (no dentro de Docker) indicada en `BACKUP_DIR` del `.env`. Por defecto es `Backend/backups/`.

| Carpeta | Contenido | Se conservan |
| --- | --- | --- |
| `daily/` | Todas las copias de los últimos días | 7 días con copia (`BACKUP_KEEP_DAILY`) |
| `weekly/` | La primera copia de cada semana | 4 semanas (`BACKUP_KEEP_WEEKLY`) |
| `monthly/` | La primera copia de cada mes | 12 meses (`BACKUP_KEEP_MONTHLY`) |
| `pre-restore/` | El estado justo antes de cada restauración | Se borran a mano |

Las horas se cambian con `BACKUP_TIMES` (por defecto `"00:00 16:00"`). Tras cambiar el `.env`: `docker compose up -d backup`.

**Esta carpeta está en el mismo disco que la base de datos.** Si ese disco se estropea o el equipo se roba, se pierde todo. Copia la carpeta a otro sitio con regularidad: un disco externo, un NAS o una carpeta sincronizada en la nube (OneDrive, Google Drive…). Lo más sencillo es poner `BACKUP_DIR` directamente en una carpeta sincronizada.

## Comprobar que funcionan

```bash
cd Backend
docker compose ps backup              # debe estar "Up"
docker compose logs --tail 20 backup  # una línea "OK: daily/..." por copia
```

Y mira que en `daily/` haya un archivo con la fecha de hoy. Revísalo una vez por semana.

## Restaurar una copia

Restaurar **sustituye toda la base de datos** por la de la copia: se pierde lo que se hiciera después. Antes de hacerlo, el script guarda el estado actual en `pre-restore/`, así que el paso se puede deshacer.

1. Pide a todos que cierren la aplicación.
2. Para el backend para que nadie escriba mientras tanto:
   ```bash
   cd Backend
   docker compose stop backend
   ```
3. Restaura. Sin argumentos usa la copia más reciente de `daily/`; para otra, indica su ruta dentro de la carpeta de copias:
   ```bash
   docker compose exec backup bash /usr/local/bin/pg-restore.sh
   docker compose exec backup bash /usr/local/bin/pg-restore.sh monthly/<archivo>.dump
   ```
   Escribe `RESTAURAR` cuando lo pida.
4. Arranca de nuevo el backend y comprueba en la aplicación que los datos son los esperados:
   ```bash
   docker compose start backend
   ```

## Antes de una actualización

Antes de actualizar el backend o mover el servidor de equipo, haz una copia manual además de las automáticas:

```bash
cd Backend
docker compose exec backup sh -c 'pg_dump -Fc -f /backups/manual_$(date +%Y%m%d_%H%M).dump'
```

Queda en la raíz de la carpeta de copias, y la rotación automática no la borra.
