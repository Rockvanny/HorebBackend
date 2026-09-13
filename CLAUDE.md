# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Backend ERP ("Horeb") para gestión comercial: clientes, proveedores, productos, presupuestos y facturas de venta/compra (con sus versiones "post" registradas), gastos de operación, series de numeración, y facturación electrónica **Veri*factu** (sistema de la AEAT española). Se distribuye como servicio Node normal en Docker, pero también se empaqueta como ejecutable Windows standalone con `pkg` para instalarse localmente en el cliente.

## Stack

- Node 18 + Express 4, sin TypeScript.
- PostgreSQL vía Sequelize 6 (ORM) y un `pg.Pool` aparte (`libs/postgres.pool.js`) para consultas crudas puntuales.
- Autenticación: Passport + `passport-jwt` (JWT en header `Authorization: Bearer`).
- Validación: Joi.
- Errores: `@hapi/boom`.
- Logs: Winston (solo nivel `error`, a fichero + consola en dev).
- Migraciones: Sequelize CLI + Umzug (Umzug ejecuta las migraciones automáticamente al arrancar `index.js`, no solo por CLI).
- Realtime: `socket.io` como dependencia (confirmar uso real por servicio antes de asumir que está activo en un flujo).
- Empaquetado a `.exe`: `pkg` (ver sección de comandos).

## Comandos

```bash
npm run dev                 # nodemon index.js (desarrollo)
npm start                   # node index.js (producción)
npm run lint                # eslint

# Migraciones (Sequelize CLI, config en .sequelizerc -> db/config.js)
npm run migrations:generate --name <nombre>
npm run migrations:run
npm run migrations:revert
npm run migrations:delete   # revierte TODAS las migraciones

# Empaquetado a ejecutable Windows
npm run build:bin           # genera dist/api-service.exe (pkg, node18-win-x64)

# Docker (backend + postgres + pgadmin)
docker compose up --build -d
docker compose up -d --build backend   # reconstruir solo el backend tras cambios
```

No hay suite de tests configurada (no hay carpeta `test/` ni script `test` en package.json) — no asumas que existen pruebas automatizadas a ejecutar.

## Configuración y arranque

- `config/config.js` no lee solo `.env`: combina variables de entorno con un fichero externo `%APPDATA%/Hexivo/config.json` (o `$HOME` en otros SO), que sobrescribe los valores de entorno si existe. Esto es clave porque el backend se distribuye como `.exe` instalado localmente en el cliente, donde ese JSON es la fuente de verdad post-instalación. `updateConfig()` permite reescribirlo en caliente.
- `libs/sequelize.js` y `libs/postgres.pool.js` construyen la URI de conexión de la misma forma a partir de `getConfig()` — si cambias la lógica de conexión, actualiza ambos.
- `index.js` es el entry point único: configura passport, CORS (whitelist hardcodeada a `http://localhost:8080`), monta las rutas, arranca migraciones con Umzug automáticamente antes de levantar el servidor, y hace un seed de un usuario `admin` si la tabla `User` está vacía (contraseña en claro en el código — revisar si se hashea en el modelo antes de tocar este flujo).
- Zona horaria fijada globalmente a `Europe/Madrid` al inicio de `index.js`.

## Arquitectura de capas

Patrón consistente en casi todos los recursos: **router → service → modelo Sequelize**, sin capa de "controller" separada (la lógica de request/response vive directamente en el router).

- `routes/*.router.js` — definen endpoints Express. Montados todos bajo `/api/v1/<recurso>` en `routes/index.js` (`routerApi(app)`). Cada ruta suele encadenar: `passport.authenticate('jwt', {session:false})` → (opcionalmente) `checkAction('ACCION_RECURSO')` → `validatorHandler(schema, 'params'|'body'|'query')` → handler async con `try/catch` que llama al service y usa `next(error)`.
  - Nota: en varios routers `checkAction(...)` está comentado/desactivado (ej. `customers.router.js`, `stats.router.js`) — la autenticación JWT está activa pero la autorización granular no siempre lo está. No asumas que un endpoint está protegido por permisos solo porque existe `checkAction` en el código.
  - `libs/router-factory.js` expone `protectedRoute(action, schemas)` como forma alternativa/más nueva de construir el stack de middlewares (auth + checkAction + validación de params/body/query); no todos los routers lo usan todavía — muchos siguen construyendo el stack a mano inline.
- `services/*.service.js` — clases (`class XService { ... }`, se instancian con `new`) con la lógica de negocio: queries a `models` (importados desde `libs/sequelize.js`, que expone `sequelize.models` tras `setupModels`), transacciones, reglas de integridad referencial antes de borrar, etc. Lanzan errores `boom` (`boom.notFound`, `boom.conflict`, `boom.badImplementation`...) que el `errorHandler` global convierte en respuesta HTTP.
- `schemas/*.schema.js` — objetos Joi por recurso, normalmente `get*Schema` (params), `create*Schema`, `update*Schema`, `query*Schema`.
- `db/models/*.model.js` — cada fichero exporta `{ Model, ModelSchema, TABLE_NAME }`. La clase extiende `Model` de Sequelize y define dos estáticos:
  - `associate(models)` — relaciones (`hasMany`, `belongsTo`, etc.).
  - `config(sequelize)` — opciones de `.init()`: `tableName`, `modelName`, `timestamps`, `underscored: true`, y en varios modelos `paranoid: true` con `deletedAt: 'deleteAt'` (soft delete). Muchos incluyen hooks propios (p.ej. `beforeValidate` para autonumeración).
  - `db/models/index.js` (`setupModels(sequelize)`) es el único sitio donde se hace `.init()` de todos los modelos y se llama a `.associate()`. Al añadir un modelo nuevo hay que registrarlo aquí explícitamente (no hay autodescubrimiento de ficheros).
- `db/migrations/*.js` — migraciones Sequelize CLI, nombradas con timestamp + `create_<tabla>_table`. `db/config.js` es la config que usa `sequelize-cli` (usa `config.dbUrl` de `config/config.js`).

## Convenciones específicas de este repo

- **Autonumeración por series** (`libs/sequence.handler.js`, hook `beforeValidate` en modelos como `Customer`, `Product`, `Vendor`, facturas, presupuestos): el campo `code` (PK de muchos recursos) NO lo manda el cliente, se genera a partir de una serie activa (`SeriesNumber`/`seriesNumber` model) según `MODEL_SERIES_MAP` en ese fichero. Al crear un modelo nuevo con autonumeración, hay que añadir su entrada ahí y crear/asignar una serie (`selectedSerie` o `seriesCode` en el payload).
- **Auditoría de usuario ejecutor**: las operaciones de escritura pasan `userExecutor` en las opciones de Sequelize (`{ transaction, userExecutor }`), y un hook global `beforeSave` en `libs/sequelize.js` copia ese valor al campo `username`/`user_name` del registro. Al añadir un método de escritura en un service, propaga siempre `userExecutor` recibido del router (`req.user.userId || req.user.sub`).
- **Soft delete**: varios modelos usan `paranoid: true` con `deleteAt` — `destroy()` no borra físicamente. Antes de un delete "real" hay que decidir si aplica ese patrón.
- **Autorización basada en módulos + rol**, en `config/access-manager.js`:
  - `MODULE_HIERARCHY` mapea un módulo de negocio (GESTION, SALES, PURCHASES, SETUP) a un flag booleano del usuario (`allowGestion`, `allowSales`, `allowPurchases`, `allowSettings`) y a la lista de "objetos" (recursos) que contiene.
  - `ROLE_ACTIONS` define qué acciones (`view/create/edit/update/delete/print`) puede hacer cada rol, por defecto o por módulo.
  - `ROLE_PAGES` restringe further qué "objetos" ve un rol dentro de un módulo (ej. `financiero` solo ve `company`/`series` dentro de SETUP).
  - `checkPermission(user, actionString)` (usado por `checkAction` en `middlewares/auth.handler.js`) parsea un string tipo `'UPDATE_COMPANY'` en `{tipo, objeto}`, ubica el módulo del objeto, y valida en orden: módulo activo en el usuario → objeto visible según `ROLE_PAGES` → acción permitida según `ROLE_ACTIONS`. Si añades un recurso nuevo, regístralo en `MODULE_HIERARCHY.<MODULO>.objects`.
  - `services/permissions.service.js` (`buildUserPermissionsConfig`) construye el payload de permisos que consume el frontend (usado por `GET /api/v1/auth/permissions-config`), recorriendo la misma jerarquía.
- **Veri*factu (facturación electrónica AEAT)**: `libs/hasInvoice.js` (`generateVerifactuHash`) calcula el hash SHA-256 encadenado (usa el hash de la factura anterior) requerido por la normativa; `services/VerifactuXml.service.js` genera el XML del `RegFactuSistemaFacturacion` con `xmlbuilder2`; `services/verifactulogs.service.js` y el modelo `verifactuLogs` llevan el registro/auditoría de los envíos. Si tocas el flujo de facturación, el orden y formato exacto de los campos concatenados en el hash es normativo, no arbitrario.
- **Nomenclatura de modelos inconsistente a propósito de mantener compatibilidad histórica**: algunos exports usan PascalCase (`Customer`, `Vendor`, `Products`) y otros camelCase (`salesBudget`, `salesInvoice`, `seriesNumber`) — respeta el nombre exacto ya usado en `db/models/index.js` y en `sequelize.models` al referenciarlos desde un service nuevo, no lo normalices sin más contexto.
- Idioma: comentarios, mensajes de error y nombres de negocio están en español; nombres de código (variables, funciones) en inglés/camelCase.
- Estilo: 2 espacios, comillas simples, `eslint:recommended` + `prettier` (ver `.eslintrc.json`, `.editorconfig`). `no-console` es solo `warn`, así que hay bastante `console.log`/`console.error` real en el código (incluido para debugging temporal) conviviendo con el logger de Winston.
