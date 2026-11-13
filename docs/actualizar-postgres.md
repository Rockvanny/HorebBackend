# Horeb · Actualizar PostgreSQL 13 a 17

_Para el responsable técnico del equipo servidor · 13 de noviembre de 2026._

PostgreSQL 13 dejó de recibir parches de seguridad en noviembre de 2025. Desde esta versión, `docker-compose.yml` usa PostgreSQL 17 (soporte hasta noviembre de 2029) para la base de datos y para las copias automáticas.

Una versión mayor de PostgreSQL no abre los datos de otra: hay que copiarlos y restaurarlos. **Se hace solo, la primera vez que se arranca con el `docker-compose.yml` nuevo.** No hay que ejecutar nada aparte.

## Cómo actualizar

Igual que cualquier otra actualización del backend:

1. Pide a todos que cierren la aplicación.
2. Descomprime el backend nuevo en la carpeta `backend`, conservando el `.env` de ese equipo.
3. En esa carpeta:

   ```
   docker compose up -d --build
   ```

La primera vez tarda algo más (medio minuto con una base de datos pequeña). Docker, por este orden:

1. **pg-upgrade-export** copia los datos de PostgreSQL 13. Si la 13 sigue en marcha, por red; si está parada, con un servidor 13 temporal. Los archivos de la 13 no se modifican.
2. Arranca **PostgreSQL 17** con un volumen nuevo (`backend_pgdata17_vol`).
3. **pg-upgrade-import** restaura la copia y comprueba, tabla a tabla, que hay las mismas filas. **Si algo no coincide, el backend no arranca** (ver «Si algo falla»).
4. Arranca el backend y las copias automáticas.

Las siguientes veces los dos pasos ven que ya está hecho (marca `BACKUP_DIR\pre-upgrade\.migrado`) y terminan en segundos.

## Comprobar que ha ido bien

```
docker logs pg-upgrade-import
```

Debe terminar con una línea como:

```
[pg-upgrade-import] Actualizado a PostgreSQL 17.x: 31 tablas, 1520 filas, todo coincide.
```

Después entra en la aplicación y revisa clientes, facturas y series. Al día siguiente, comprueba que hay copias nuevas en `BACKUP_DIR\daily`.

La copia de la versión 13 queda en `BACKUP_DIR\pre-upgrade\<fecha>_<base>_pg13.dump`.

## Si algo falla

`docker compose up` termina con un error en `pg-upgrade-export` o `pg-upgrade-import`, y el backend no arranca. Los datos de la 13 siguen intactos. Mira el motivo con:

```
docker logs pg-upgrade-export
docker logs pg-upgrade-import
```

Corregido el problema, basta con volver a ejecutar `docker compose up -d`: reutiliza la copia ya hecha (`pending.dump`).

## Borrar los datos viejos

Los datos de PostgreSQL 13 siguen en el volumen `backend_pgdata_vol`. Cuando lleves unos días sin problemas:

```
docker volume rm backend_pgdata_vol
```

## Volver a PostgreSQL 13

Solo si algo va mal. Lo que se haya grabado en la 17 después de actualizar se pierde.

1. `docker compose down`
2. Descomprime el backend de la versión anterior (o recupera su `docker-compose.yml`).
3. `docker compose up -d`

La aplicación vuelve a usar el volumen de la 13, que la actualización no toca. Las copias hechas con PostgreSQL 17 no se pueden restaurar en la 13; las de antes de actualizar, sí.

## Nombre del proyecto

`docker-compose.yml` fija `name: backend`: los volúmenes se llaman siempre `backend_...`, aunque la carpeta tenga otro nombre. Las instalaciones creadas en una carpeta `backend` (lo habitual) ya usaban esos nombres.
