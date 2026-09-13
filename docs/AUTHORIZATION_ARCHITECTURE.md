# Autorización — arquitectura y estado actual (backend)

Documento interno de referencia para quien mantenga o extienda el sistema de permisos de Horeb. Verificado contra el código real el 2026-09-13, incluyendo pruebas ejecutadas (no solo lectura).

## 1. Modelo conceptual (dos ejes independientes)

1. **Módulos activables por usuario** — cada usuario (no cada rol) tiene flags booleanos en la tabla `users`: `allowGestion`, `allowSales`, `allowPurchases`, `allowReports`, `allowSettings`. Determinan si ese usuario puede usar ese módulo de negocio **en absoluto**, sin importar su rol.
2. **Acciones permitidas por rol** — dentro de un módulo activo, el *rol* del usuario determina qué puede hacer (`view`, `create`, `edit`, `update`, `delete`, `print`).
3. **Visibilidad de página por rol** (opcional, allowlist) — un rol puede tener restringido qué objetos concretos ve dentro de un módulo, aunque el módulo esté activo (ej. `financiero` solo ve `company`/`series` dentro de `SETUP`, no `users`/`conexion`).

Estos tres ejes son independientes: un usuario puede tener el módulo activo pero el rol no le deja hacer cierta acción, o el módulo activo pero su rol le oculta ciertos objetos dentro de él.

## 2. Piezas del sistema

| Fichero | Rol |
|---|---|
| [config/access-manager.js](../config/access-manager.js) | Fuente de verdad: `ROLES`, `MODULE_HIERARCHY`, `ACTIONS`, `ROLE_ACTIONS`, `ROLE_PAGES`, y la función `checkPermission(user, actionString)`. |
| [middlewares/auth.handler.js](../middlewares/auth.handler.js) | `checkAction(actionString)` — middleware Express que envuelve `checkPermission`; `checkRole(...roles)` — middleware más simple basado solo en el rol. |
| [libs/router-factory.js](../libs/router-factory.js) | `protectedRoute(action, schemas)` — helper que combina `passport.authenticate` + `checkAction` + validadores Joi en un solo array de middlewares. Existe pero **hoy no lo usa activamente ningún router** (el único que lo referencia, `company.router.js`, lo tiene comentado). |
| [services/permissions.service.js](../services/permissions.service.js) | `buildUserPermissionsConfig(userData)` — construye el payload que consume el frontend. Expuesto en `GET /api/v1/auth/permissions-config` ([routes/auth.router.js](../routes/auth.router.js)). |

## 3. Cómo resuelve `checkPermission(user, actionString)` paso a paso

Ejemplo: `checkPermission(user, 'VIEW_CUSTOMERS')`.

1. Parsea el string: `type = 'VIEW'`, `objectName = 'CUSTOMERS'` (si no hay `_`, asume `type = 'VIEW'` por defecto).
2. Busca en qué módulo vive ese objeto: recorre `MODULE_HIERARCHY`, comparando `objectName` contra `MODULE_HIERARCHY[key].objects` **de forma case-insensitive** (`o.toUpperCase() === objectName`). Si no lo encuentra en ningún módulo → `false`.
3. Comprueba que el usuario tenga ese módulo activo: `user[MODULE_HIERARCHY[moduleKey].field]` debe ser `true`/`1`/`"true"`/`"1"`. Si no → `false`.
4. Si `ROLE_PAGES[rol][moduleKey]` existe (allowlist definida para ese rol en ese módulo), `objectName` debe estar en esa lista (también case-insensitive) → si no está, `false`.
5. Comprueba `ROLE_ACTIONS[rol].modules[moduleKey]` (override específico del módulo) o, si no existe, `ROLE_ACTIONS[rol].default`. El `type` debe estar en esa lista → si no, `false`. Si el rol no tiene entrada en `ROLE_ACTIONS` en absoluto → `false`.

Si pasa las 5 comprobaciones → `true`.

## 4. Módulos actuales (`MODULE_HIERARCHY`)

| Módulo | Flag en `User` | Objetos | Notas |
|---|---|---|---|
| `GESTION` | `allowGestion` (default `true`) | `customers`, `vendors`, `products`, `operatingExpenses` | Datos maestros. |
| `SALES` | `allowSales` (default `true`) | `salesBudgets`, `salesInvoices`, `salesOverdueInvoices`, `salesPostInvoices`, `verifactuLogs` | |
| `PURCHASES` | `allowPurchases` (default `false`) | `purchInvoices`, `purchOverDueInvoices`, `purchPostInvoices` | |
| `SETUP` | `allowSettings` (default `false`) | `company`, `series`, `users`, `conexion` | `ROLE_PAGES` restringe `financiero` a solo `company`/`series` aquí. |
| `REPORTS` | `allowReports` (default `false`) | `stats` | **Añadido 2026-09-13.** Antes `allowReports` existía en el modelo pero no gateaba nada. Opt-in a propósito: nadie ve el dashboard financiero salvo que se le active explícitamente (`createFirstAdmin` se lo activa al admin inicial). |

## 5. Roles y acciones por defecto (`ROLE_ACTIONS`)

| Rol | Acciones por defecto |
|---|---|
| `admin` | todas (`view, create, edit, update, delete, print`) |
| `financiero` | todas |
| `vendedor` | `view, create, edit, update, print` (no `delete`) |
| `viewer` | `view, print` |
| `externo` | `view` |
| `system` | `view, create, edit, update, delete` (sin `print`) |

Ningún rol tiene hoy overrides por módulo en `ROLE_ACTIONS.modules` — el `default` aplica igual en todos los módulos que ese rol pueda ver.

## 6. Cómo añadir un recurso nuevo protegido

1. Decide a qué módulo pertenece (o si necesita uno nuevo) y añade el nombre del objeto a `MODULE_HIERARCHY[modulo].objects` en `access-manager.js` — usa el mismo nombre que usa el frontend/las rutas para ese recurso (camelCase, como ya hacen el resto).
2. En el router, después de `passport.authenticate('jwt', {session:false})`, añade `checkAction('ACCION_OBJETO')` (ej. `checkAction('DELETE_PRODUCTS')`). El nombre del objeto en el string debe coincidir con el que pusiste en el paso 1 (la comparación es case-insensitive, pero debe ser la misma palabra).
3. Si un rol necesita ver ese objeto de forma distinta al resto (oculto, o con acciones distintas), añade una entrada en `ROLE_PAGES`/`ROLE_ACTIONS.modules` para ese rol.
4. Prueba con `node -e` llamando a `checkPermission` directamente con distintos usuarios simulados antes de dar por buena la ruta (ver sección 9).

## 7. Bug histórico corregido (2026-09-13)

`checkPermission` comparaba `objectName` (siempre `.toUpperCase()`) contra `MODULE_HIERARCHY[key].objects`, que están en camelCase (`'salesBudgets'`, `'customers'`). `Array.includes()` es comparación exacta, así que **nunca encontraba ningún módulo, para ningún objeto** → la función devolvía `false` siempre, para cualquier usuario (incluido admin) y cualquier acción. El mismo problema existía en el filtro de `ROLE_PAGES`. Es la razón real de que `checkAction` llevara meses desactivado en todos los routers: activarlo sin este fix habría bloqueado el 100% de las acciones para el 100% de los usuarios, incluido el admin.

**Fix**: comparación case-insensitive en ambos puntos (`objects.some(o => o.toUpperCase() === objectName)`), sin cambiar la casing de los datos (el frontend y `permissions.service.js` siguen recibiendo los nombres en camelCase tal cual estaban).

## 8. Estado actual de activación por router

| Router | Estado |
|---|---|
| `stats.router.js` | ✅ **Activo** — `checkAction('VIEW_STATS')` en ambos endpoints. |
| `customers.router.js` | ✅ **Activo** — `checkAction` en los 7 endpoints (`VIEW`/`CREATE`/`UPDATE`/`DELETE_CUSTOMERS`). Probado con matriz de roles. |
| `seriesNumber.router.js` | ✅ **Activo** — `checkAction` en los 8 endpoints (`VIEW`/`CREATE`/`UPDATE`/`DELETE_SERIES`). Probado: admin `200`, vendedor sin `allowSettings` `403`. |
| `company.router.js` | 🔴 **Sin autenticación siquiera** (ni `passport.authenticate`) — CRUD completo accesible sin token. Crítico, pendiente. |
| `conexion.router.js` | 🔴 **Sin autenticación siquiera** — igual que arriba. |
| `enums.router.js` | 🔴 **Sin autenticación siquiera** — impacto menor (solo lectura de metadatos). |
| Todo el resto (`users`, `vendors`, `products`, `salesBudgets*`, `salesInvoices*`, `salesPostInvoice*`, `purchInvoice*`, `purchPostInvoice*`, `verifactuLogs`, `operatingExpenses`, `documentTax`, `config`) | 🟡 JWT activo, `checkAction` comentado — cualquier usuario autenticado puede hacer cualquier cosa. |

## 9. Gaps conocidos que faltan por resolver antes de activar el resto

- **`VERIFACTU` vs `verifactuLogs`**: `verifactulogs.router.js` usa `checkAction('VIEW_VERIFACTU')`, pero el objeto real en `MODULE_HIERARCHY.SALES.objects` es `'verifactuLogs'`. No es un problema de mayúsculas (ya resuelto), es un nombre distinto — hay que alinear uno de los dos lados antes de descomentar ese router.
- **`SALES` como objeto genérico**: `documentTax.router.js` usa `checkAction('VIEW_SALES')`, pero `'SALES'` es la clave del módulo, no un objeto dentro de él — nunca va a resolver a ningún módulo. El propio comentario original del código ya admitía que era un placeholder.
- **Rol `'master'` huérfano**: existe una constante `ROLES` en `services/user.service.js` que lo incluye, pero no se usa para validar nada. `access-manager.js` no tiene `'master'` en `ROLES` ni en `ROLE_ACTIONS` — si algún usuario real tuviera ese rol, quedaría sin ningún permiso al activar `checkAction`.
- **`role` es texto libre en el schema Joi** (`Joi.string().min(5)`) — no hay lista cerrada de roles válidos en la validación de entrada, desconectada de los roles reales de `access-manager.js`.
- **`license.modules`** (de la licencia comercial) no se cruza todavía con `MODULE_HIERARCHY` — la licencia hoy solo gatea "¿puede esta instalación usar la API?", no qué módulos concretos puede usar esa instalación.

## 10. Cómo probar sin depender del frontend

Probar `checkPermission` en aislado, sin arrancar nada:
```bash
node -e "
const { checkPermission } = require('./config/access-manager');
const user = { role: 'vendedor', allowGestion: true, allowSales: true, allowPurchases: false, allowReports: false, allowSettings: false };
console.log(checkPermission(user, 'VIEW_CUSTOMERS'));   // true
console.log(checkPermission(user, 'DELETE_CUSTOMERS')); // false (vendedor no borra)
console.log(checkPermission(user, 'VIEW_STATS'));       // false (allowReports es false)
"
```

Probar un endpoint real sin pasar por el flujo completo de login+OTP: firmar un JWT manualmente con el mismo secreto que usa el backend (`JWT_SECRET` del `.env`), útil solo para pruebas internas, nunca en código de producción:
```bash
docker exec server node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign({ sub: 'CODIGO_USUARIO', role: 'vendedor' }, process.env.JWT_SECRET, { expiresIn: '5m' }));
"
```
