# Contrato de autenticación (backend → frontend)

Todos los endpoints cuelgan de `/api/v1`. Verificado contra la implementación real (no es solo documentación de intención) el 2026-09-13.

## 1. Convenciones de respuesta

**Éxito**, casi siempre:
```json
{ "success": true, "data": { ... } }
```
Dos excepciones que NO anidan en `data` (van con spread, ojo al parsear):
- `PATCH /users/update-password-initial/:id` → `{ "success": true, "message": "...", "user": {...} }`
- `POST /users/forgot-password/reset` → `{ "success": true, "message": "..." }`

**Error de negocio / autenticación** (vía `@hapi/boom`):
```json
{ "success": false, "statusCode": 401, "error": "Unauthorized", "message": "Usuario o contraseña incorrectos" }
```

**Error de validación de payload** (Joi, `400`) — el `message` es el texto crudo de Joi, **en inglés**, no un mensaje curado en español. No mostrarlo tal cual al usuario final; mapear por campo si se necesita un mensaje amigable:
```json
{ "success": false, "statusCode": 400, "error": "Bad Request", "message": "\"password\" is not allowed to be empty" }
```

**Rate limit por IP** (`express-rate-limit`, no pasa por boom) — nota: **no lleva el campo `error`**, a diferencia de los dos anteriores:
```json
{ "success": false, "statusCode": 429, "message": "Demasiadas solicitudes. Inténtalo de nuevo más tarde." }
```
Un `429` que sí trae `error: "Too Many Requests"` viene de la lógica de negocio del OTP (cooldown de reenvío / límite de reenvíos agotado), no del limitador por IP — mismo status code, dos orígenes distintos, tratar igual en UI (deshabilitar reintento un momento) pero no asumir siempre la misma forma de body.

## 2. Arranque: decidir qué pantalla mostrar

`GET /api/v1/setup/status` — sin autenticación, sin restricción de licencia. **Llamar siempre antes de decidir qué pantalla mostrar.**

```json
{ "success": true, "data": {
  "needsSetup": true,
  "license": { "status": "TRIAL", "daysRemaining": 15 }
}}
```

`license.status` puede ser `"TRIAL"` (con `daysRemaining`), `"TRIAL_EXPIRED"`, o `"LICENSED"` (con `customer`, `plan`, `modules`, `expiresAt`).

Lógica de decisión:
1. `needsSetup === true` → asistente de alta del primer admin (sección 3). Nunca login.
2. `needsSetup === false` y `license.status === "TRIAL_EXPIRED"` → el login normal sigue funcionando (está exento de la puerta de licencia), pero **cualquier otra llamada devolverá `402`** hasta activar una licencia. Ver sección 7.
3. En cualquier otro caso → login normal (sección 4).

## 3. Alta del primer administrador (solo si `needsSetup: true`)

`POST /api/v1/setup/first-admin` — sin autenticación. Rechaza si ya existe cualquier usuario.

Body:
```json
{ "fullName": "Nombre Apellido", "email": "admin@cliente.com", "password": "mínimo 8 caracteres" }
```

Éxito `201`:
```json
{ "success": true, "data": {
  "code": "napellido", "fullName": "Nombre Apellido", "email": "admin@cliente.com",
  "role": "admin", "mustChangePassword": false,
  "allowGestion": true, "allowSales": true, "allowPurchases": true, "allowReports": true, "allowSettings": true,
  "createdAt": "...", "updatedAt": "..."
}}
```
`code` es autogenerado (no lo mandéis) a partir del nombre — es el identificador de login, no el email.

Error `403` si ya hay usuarios: `{"message": "Ya existe al menos un usuario en esta instalación"}`.

## 4. Login (dos pasos: password + OTP por email)

**No hay login de un solo paso.** El JWT solo se emite tras verificar el código.

### 4.1 `POST /users/login`
Body: `{ "email": "...", "password": "..." }`
Rate limit: 10 req / 15 min por IP.

Éxito `200`:
```json
{ "success": true, "data": { "challengeId": "uuid", "expiresInSeconds": 300, "maskedEmail": "a****@dominio.com" } }
```
Guardar `challengeId` para el paso siguiente. **No hay token todavía.**

Errores:
- `401` `"Usuario o contraseña incorrectos"` — email no existe O contraseña incorrecta (indistinguible a propósito, no reveléis cuál).
- `428 Precondition Required` `"No hay ningún usuario creado todavía..."` — la instalación no tiene usuarios; solo puede pasar si no se llamó a `setup/status` antes. Tratarlo como señal de ir al asistente de alta (sección 3).
- `429` — rate limit (ver sección 1).

### 4.2 `POST /users/login/verify-otp`
Body: `{ "challengeId": "uuid", "otp": "123456" }` (`otp` son 6 dígitos exactos).
Rate limit: 20 req / 5 min por IP.

Éxito `200`:
```json
{ "success": true, "data": { "user": { "code": "...", "fullName": "...", "email": "...", "role": "admin", "allowGestion": true, "...": "..." }, "token": "eyJ..." } }
```
`token` es el JWT de sesión (8h de validez). Guardarlo y mandarlo en `Authorization: Bearer <token>` en todas las llamadas siguientes.

Errores (todos `401` salvo que se indique):
- `"Código inválido o expirado"` — `challengeId` no existe, ya se consumió, o no es del propósito correcto.
- `"El código ha expirado, solicita uno nuevo."` — pasado el tiempo de expiración (5 min por defecto). Ofrecer botón de reenvío (4.3).
- `"Código incorrecto"` — dígitos equivocados, cuenta como intento (máx. 5 por defecto).
- `"Código incorrecto. Has agotado los intentos, vuelve a iniciar sesión."` — se agotaron los intentos; el reto queda inválido, **hay que volver al paso 4.1** (no hay reenvío posible en este estado).
- `429` — rate limit.

### 4.3 `POST /users/login/resend-otp`
Body: `{ "challengeId": "uuid" }`. Rate limit: 20 req / 5 min por IP (además del límite propio del reto).

Éxito `200`: `{ "success": true, "data": { "expiresInSeconds": 300 } }` (reinicia el contador de expiración).

Errores:
- `401` `"Código inválido o expirado"` — mismo criterio que arriba.
- `429` `"Espera unos segundos antes de solicitar un nuevo código."` — cooldown de 45s entre reenvíos.
- `429` `"Has alcanzado el límite de reenvíos. Vuelve a iniciar sesión."` — máx. 3 reenvíos por reto; hay que volver a 4.1.

## 5. Olvidé mi contraseña (sin sesión previa)

Mismo mecanismo de OTP que el login, propósito distinto. **La respuesta del primer paso es intencionalmente idéntica exista o no el email** — no uséis la respuesta para decidir si un email está registrado.

### 5.1 `POST /users/forgot-password`
Body: `{ "email": "..." }`. Rate limit: 10 req / 15 min por IP.

Éxito `200` (siempre, exista o no el email):
```json
{ "success": true, "data": { "challengeId": "uuid", "expiresInSeconds": 300, "maskedEmail": "a****@dominio.com" } }
```
Si el email no existe, este `challengeId` es un valor sin reto real detrás: cualquier intento de usarlo en 5.2/5.3 dará el mismo `401`/`429` que un reto real inválido o expirado — comportamiento indistinguible por diseño.

### 5.2 `POST /users/forgot-password/resend-otp`
Igual forma y errores que 4.3.

### 5.3 `POST /users/forgot-password/reset`
Body: `{ "challengeId": "uuid", "otp": "123456", "password": "nueva contraseña, mínimo 8" }`. Rate limit: 20 req / 5 min por IP.

Éxito `200`:
```json
{ "success": true, "message": "Contraseña actualizada correctamente" }
```
(Sin `data`, sin `user`, sin token — tras resetear hay que hacer login normal, sección 4.)

Errores: mismos que verify-otp (401 código inválido/expirado/incorrecto/intentos agotados, 429 rate limit). No hay endpoint separado de "verificar código" antes de fijar la contraseña — se hace todo en una sola llamada.

## 6. Cambio de contraseña estando logueado

`PATCH /users/update-password-initial/:id` — **requiere sesión** (`Authorization: Bearer <token>`). Usado tanto para el cambio forzado inicial (`mustChangePassword: true`) como para un cambio voluntario.

Body: `{ "currentPassword": "...", "password": "nueva, mínimo 8" }`. `:id` debe ser el `code` del propio usuario logueado.

Éxito `200`: `{ "success": true, "message": "Contraseña actualizada correctamente", "user": {...} }`

Errores:
- `403` si `:id` no coincide con el usuario del token (`"Solo puedes cambiar tu propia contraseña"`).
- `401` si `currentPassword` no coincide (`"La contraseña actual no es correcta"`).
- `404` si el usuario no existe.

## 7. Después del login: usar el JWT y manejar `402`

Todas las llamadas autenticadas van con `Authorization: Bearer <token>`. Sin ese header (o con uno inválido/caducado), cualquier endpoint protegido responde `401`.

**Importante — puerta de licencia global:** salvo `setup/*`, `license/*`, `users/login*` y `users/forgot-password*`, **toda** la API responde `402 Payment Required` si la instalación no tiene trial vigente ni licencia activa:
```json
{ "success": false, "statusCode": 402, "error": "Payment Required", "message": "El periodo de prueba ha terminado. Activa una licencia para seguir usando la aplicación." }
```
El frontend debe capturar `402` de forma **global** (interceptor de la capa HTTP, no caso por caso) y redirigir a una pantalla de activación de licencia (`GET /license/fingerprint` + `POST /license/activate`, ambos autenticados). Es perfectamente posible que el login funcione (el trial estaba vivo cuando se emitió el JWT) y que la siguiente llamada normal dé `402` igualmente.

## 8. Resumen de rate limits

| Endpoint | Límite |
|---|---|
| `POST /users/login` | 10 / 15 min / IP |
| `POST /users/forgot-password` | 10 / 15 min / IP |
| `POST /users/login/verify-otp` | 20 / 5 min / IP |
| `POST /users/login/resend-otp` | 20 / 5 min / IP |
| `POST /users/forgot-password/resend-otp` | 20 / 5 min / IP |
| `POST /users/forgot-password/reset` | 20 / 5 min / IP |

A esto se suma, por cada reto OTP individual (no por IP): expira a los 5 min, máximo 5 intentos de código, cooldown de 45s entre reenvíos, máximo 3 reenvíos por reto.
