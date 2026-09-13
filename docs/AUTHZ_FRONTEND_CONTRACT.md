# Contrato de autorización (backend → frontend)

Complementa a [AUTH_LOGIN_CONTRACT.md](AUTH_LOGIN_CONTRACT.md). Este documento cubre qué puede ver y hacer un usuario **una vez logueado**: qué módulos cargarle, qué páginas mostrar dentro de cada uno, y qué botones habilitar. Verificado contra la API real el 2026-09-13.

## ⚠️ Léelo antes de nada: qué está aplicado de verdad hoy en el servidor

Este contrato describe la forma completa del sistema de permisos, pero **hoy el backend solo hace cumplir esto de verdad en un endpoint**: `GET /stats/stats` y `GET /stats/budget/:code` (módulo `REPORTS`). El resto de endpoints (`customers`, `vendors`, `products`, `salesBudgets`, `salesInvoices`, `purchInvoices`, etc.) **todavía no rechazan nada en el servidor** — cualquier usuario con sesión válida puede llamarlos, exista o no el módulo/objeto en su `permissions-config`.

**Qué significa esto para vosotros**: construid la UI (menús, botones, páginas visibles) siguiendo este contrato desde ya — así cuando el backend vaya activando la autorización en el resto de endpoints (progresivo, uno a uno), no tendréis que tocar nada en el frontend. Pero no asumáis todavía que ocultar un botón es garantía de seguridad — el backend es quien decide eso, y hoy no lo decide en todos lados.

Aparte, dos endpoints (`GET/POST/PATCH/DELETE /company` y todo `/conexion`) **no exigen ni sesión** en este momento (ni siquiera un token) — es un hallazgo de seguridad pendiente de corregir, no relacionado con la autorización en sí, pero avisamos por si integráis esas pantallas.

## Endpoint: `GET /api/v1/auth/permissions-config`

Requiere sesión: `Authorization: Bearer <token>`. Llamadlo una vez justo después del login (o al recargar la app con un token guardado) y usad el resultado para construir la navegación de esa sesión.

### Forma de la respuesta

```json
{
  "role": "admin",
  "actions": ["VIEW", "CREATE", "EDIT", "UPDATE", "DELETE", "PRINT"],
  "modules": {
    "GESTION":   { "objects": ["customers", "vendors", "products", "operatingExpenses"] },
    "SALES":     { "objects": ["salesBudgets", "salesInvoices", "salesOverdueInvoices", "salesPostInvoices", "verifactuLogs"] },
    "PURCHASES": { "objects": ["purchInvoices", "purchOverDueInvoices", "purchPostInvoices"] },
    "SETUP":     { "objects": ["company", "series", "users", "conexion"] },
    "REPORTS":   { "objects": ["stats"] }
  }
}
```

### Cómo interpretarlo

- **`role`**: el rol del usuario (`admin`, `financiero`, `vendedor`, `viewer`, `externo`). Informativo; no lo uséis para decidir permisos directamente, usad `actions`/`modules` que ya vienen calculados.
- **`actions`**: acciones que el usuario puede hacer **por defecto**, en cualquier módulo que tenga activo, salvo que ese módulo traiga su propio array `actions` (ver siguiente punto). Valores posibles: `VIEW`, `CREATE`, `EDIT`, `UPDATE`, `DELETE`, `PRINT`.
- **`modules`**: un objeto por cada módulo que el usuario tiene activo. **Si una clave de módulo no aparece aquí, ese usuario no tiene ese módulo activo en absoluto — ocultad esa sección del menú por completo**, no la mostréis deshabilitada.
  - `objects`: lista de páginas/recursos visibles dentro de ese módulo para este usuario+rol. Si un objeto no está en la lista, no mostréis su entrada de menú ni permitáis navegar a esa pantalla (aunque el módulo esté activo).
  - `actions` (opcional, solo aparece si el rol tiene un override específico para ese módulo): si está presente, sustituye al array `actions` global **solo dentro de ese módulo**. Hoy ningún rol tiene overrides por módulo — siempre que aparezca `modules`, usad el `actions` global.

### Ejemplo: vendedor sin acceso a `SETUP` ni `REPORTS`

```json
{
  "role": "vendedor",
  "actions": ["VIEW", "CREATE", "EDIT", "UPDATE", "PRINT"],
  "modules": {
    "GESTION": { "objects": ["customers", "vendors", "products", "operatingExpenses"] },
    "SALES":   { "objects": ["salesBudgets", "salesInvoices", "salesOverdueInvoices", "salesPostInvoices", "verifactuLogs"] }
  }
}
```
Nótese: sin `DELETE` en `actions` (vendedor no borra), y sin las claves `PURCHASES`/`SETUP`/`REPORTS` — ese usuario en concreto no tiene esos módulos activos, independientemente de su rol (los módulos se activan por usuario, no solo por rol).

### Ejemplo: `financiero` con `SETUP` restringido

Un usuario `financiero` con `allowSettings: true` recibe `SETUP` en `modules`, pero solo con `objects: ["company", "series"]` — nunca `users` ni `conexion`, aunque el módulo esté activo. Esa restricción es a nivel de rol, no de usuario individual.

## Módulos y objetos disponibles hoy

| Módulo | Objetos |
|---|---|
| `GESTION` | `customers`, `vendors`, `products`, `operatingExpenses` |
| `SALES` | `salesBudgets`, `salesInvoices`, `salesOverdueInvoices`, `salesPostInvoices`, `verifactuLogs` |
| `PURCHASES` | `purchInvoices`, `purchOverDueInvoices`, `purchPostInvoices` |
| `SETUP` | `company`, `series`, `users`, `conexion` |
| `REPORTS` | `stats` — el dashboard de gráficos de la pantalla de inicio. Nuevo: antes cualquiera con sesión lo veía, ahora requiere que el módulo esté activo para ese usuario. |

## Cuando el backend sí aplica el permiso: forma del error

Para los endpoints donde la autorización ya está activa (hoy: `stats`), un usuario sin acceso recibe:

```json
{ "success": false, "statusCode": 403, "error": "Forbidden", "message": "Acceso denegado a la acción: VIEW_STATS" }
```

Mismo formato que el resto de errores del backend (ver [AUTH_LOGIN_CONTRACT.md](AUTH_LOGIN_CONTRACT.md), sección de convenciones). Tratadlo igual que cualquier otro `403`: no reintentar, mostrar mensaje genérico de "no tienes acceso", no exponer el `message` crudo si no hace falta.

## Recomendación práctica de integración

1. Tras el login, llamad a `permissions-config` una vez y guardad el resultado en memoria/estado de la sesión (no hace falta refrescarlo salvo que el usuario cierre sesión o se le cambien permisos).
2. Construid el menú lateral iterando las claves presentes en `modules` — nunca hardcodeéis la lista completa de módulos posibles en el frontend, iterad lo que venga.
3. Dentro de cada módulo, filtrad las páginas por `modules.X.objects`.
4. Habilitad/deshabilitad botones de crear/editar/borrar/imprimir según `actions` (o el override del módulo si existiera).
5. Capturad `403` de forma genérica en el interceptor HTTP (igual que ya hacéis con el `402` de licencia) — a medida que el backend active más endpoints, empezaréis a recibir `403` donde antes no pasaba nada; no debería requerir cambios de código si ya seguisteis los puntos 1-4.
