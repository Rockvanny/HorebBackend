# SEGURIDAD.md

Bitácora de seguridad del backend de Horeb (API Node/Express/Sequelize). Alcance: exclusivamente backend — autenticación, autorización, validación, persistencia y configuración del servidor. No cubre frontend, UI/UX ni infraestructura ajena a este repo (excepto lo estrictamente necesario para arrancar el servicio, p. ej. `docker-compose.yml`).

Cada punto usa una casilla de verificación:
- `- [x]` — implementado y verificado contra el código actual.
- `- [ ]` — pendiente, no implementado todavía.

Última revisión: 2026-09-13. La sección **Autenticación** está verificada no solo leyendo código sino probando cada endpoint contra la API real corriendo en Docker (login, OTP, reseteo de contraseña, casos de error) — se marca explícitamente dónde. El resto de secciones están verificadas por lectura/grep del código, sin ejecución.

---

## Autenticación — **completa y probada de extremo a extremo**

- [x] Login en dos pasos (password + OTP por email) — `POST /users/login` valida credenciales y no emite JWT; `POST /users/login/verify-otp` verifica el código y emite el token. **Probado**: password correcta → reto OTP → código correcto → JWT válido aceptado por un endpoint protegido. [routes/users.router.js](routes/users.router.js), [services/user.service.js](services/user.service.js), [services/otp.service.js](services/otp.service.js).
- [x] Reenvío de OTP con cooldown (45s) y máximo de reenvíos (3), y máximo de intentos (5) antes de quemar el reto. **Probado**: reenvío inmediato devuelve `429` de cooldown correctamente. [services/otp.service.js](services/otp.service.js).
- [x] **Reseteo de contraseña sin sesión previa ("olvidé mi contraseña")** — `POST /users/forgot-password` (genera OTP de propósito `PASSWORD_RESET` si el email existe), `POST /users/forgot-password/resend-otp`, `POST /users/forgot-password/reset` (verifica el código y fija la contraseña nueva en la misma llamada, sin pedir la contraseña anterior). **Probado**: email existente y email inexistente devuelven una respuesta con la misma forma (mismo `challengeId` sintético, mismo `maskedEmail`), para no permitir enumeración de cuentas por el contenido de la respuesta. [routes/users.router.js](routes/users.router.js), [services/user.service.js](services/user.service.js), [services/otp.service.js](services/otp.service.js).
- [x] Email de OTP diferenciado por propósito (`LOGIN_2FA` vs `PASSWORD_RESET`) — asunto y texto distintos para no confundir "código de acceso" con "código de reseteo". [services/otp.service.js](services/otp.service.js).
- [x] Código OTP generado con CSPRNG (`crypto.randomInt`), almacenado solo como hash SHA-256 (nunca en claro), comparado con `crypto.timingSafeEqual`. [services/otp.service.js](services/otp.service.js).
- [x] Contraseñas hasheadas con bcrypt (`beforeCreate`/`beforeUpdate` hooks, coste 10), nunca en claro. [db/models/user.model.js](db/models/user.model.js#L148-L159).
- [x] `JWT_SECRET` obligatorio — `getConfig()` lanza error y el proceso no arranca sin él; eliminado el fallback `'secret_key'`. [config/config.js](config/config.js#L57-L63).
- [x] `PATCH /users/update-password-initial/:id` requiere sesión JWT, solo permite `id === req.user.code`, y exige la contraseña actual verificada con bcrypt antes de aceptar la nueva. [routes/users.router.js](routes/users.router.js), [services/user.service.js](services/user.service.js).
- [x] Rate limiting en login, forgot-password (`loginLimiter`, 10 req/15min/IP) y en verificación/reenvío de OTP de ambos flujos (`otpLimiter`, 20 req/5min/IP). [middlewares/rateLimiter.js](middlewares/rateLimiter.js).
- [x] Sin seed de usuario maestro con credenciales fijas — el primer usuario se crea vía `POST /setup/first-admin` solo si la tabla `User` está vacía. **Probado**: `setup/status` → `needsSetup:true` → `first-admin` crea el admin → un segundo intento de `first-admin` es rechazado con `403`. [index.js](index.js#L82-L86), [routes/setup.router.js](routes/setup.router.js), [services/user.service.js](services/user.service.js).
- [x] Campos sensibles (`password`, `otp`, `securityKey`, `token`) redactados antes de escribirse en el log de errores. [middlewares/error.handler.js](middlewares/error.handler.js#L5-L14).
- [x] Fallo de envío de OTP (login o reseteo) ya registra la causa real en el log interno (Winston) antes de devolver el `502` genérico al cliente — antes se descartaba el error original y era imposible diagnosticar un fallo de Resend en remoto. **Probado**: forzado un fallo real (`403 domain not verified`) y confirmado que queda en `logs/error.log` con el mensaje exacto de Resend. [services/otp.service.js](services/otp.service.js).
- [x] Payload del JWT minimizado (`sub`, `role`) — sin bloque `permissions` redundante que nunca se leía. [services/user.service.js](services/user.service.js).
- [x] Envío de emails desacoplado en `libs/mailer.js`, con `to`/`from` y contenido nunca hardcodeados en el servicio de negocio. [libs/mailer.js](libs/mailer.js), [libs/maskEmail.js](libs/maskEmail.js).
- [ ] Tokens JWT sin mecanismo de revocación (`tokenVersion` o blacklist). Un token de 8h sigue siendo válido aunque se cambie la contraseña, se resetee, se desactive el usuario o cambie el rol. **Nota**: con el reseteo de contraseña ya implementado, este hueco es más relevante que antes — hoy, tras un reseteo por "olvidé mi contraseña", cualquier sesión JWT anterior de ese usuario sigue siendo válida hasta su expiración natural (8h).
- [ ] Rotación pendiente de credenciales reales (Postgres, pgAdmin) que estuvieron expuestas en el historial de git — no es un cambio de código, requiere rotarlas en la infraestructura real.

## Validación de entrada

- [x] Validación Joi en la mayoría de endpoints vía `validatorHandler(schema, 'body'|'params'|'query')`.
- [x] Esquemas de OTP (login y reseteo) validan formato exacto (`guid` para `challengeId`, 6 dígitos numéricos para `otp`). **Probado**: payloads con formato inválido devuelven `400` con el detalle de Joi. [schemas/user.schema.js](schemas/user.schema.js).
- [ ] Política de contraseñas mínima — solo `min(8)`, sin exigir complejidad (mayúsculas, números, símbolos) ni lista de contraseñas comunes. Afecta a `createUserSchema`, `updateUserSchema`, `updateOwnPasswordSchema`, `resetPasswordSchema` y `createFirstAdminSchema`. [schemas/user.schema.js](schemas/user.schema.js), [schemas/setup.schema.js](schemas/setup.schema.js).

## Control de accesos (autorización)

- [x] **Bug crítico corregido en `checkPermission` (`config/access-manager.js`): comparación de mayúsculas rota que hacía que la función denegara SIEMPRE, para cualquier usuario (incluido admin) y cualquier acción.** `objectName` llega como `.toUpperCase()` pero `MODULE_HIERARCHY.objects`/`ROLE_PAGES[...]` usan camelCase (`'salesBudgets'`, `'customers'`); `.includes(objectName)` nunca casaba con nada. **Probado antes y después del fix**: `checkPermission({role:'admin', allowGestion:true}, 'VIEW_CUSTOMERS')` devolvía `false` antes, `true` después. Verificados 8 escenarios (módulo activo/apagado, restricción `ROLE_PAGES`, acciones permitidas/denegadas por rol) — todos correctos tras el fix. Este bug es la razón de que `checkAction` siguiera desactivado en todos los routers: reactivarlo sin este fix habría bloqueado el 100% de las acciones para el 100% de los usuarios. [config/access-manager.js](config/access-manager.js).
- [x] **Módulo `REPORTS` añadido** (`field: 'allowReports'`, `objects: ['stats']`) — conecta el campo `allowReports` del modelo `User`, que existía pero no gateaba nada. Con `allowReports: false` por defecto en usuarios nuevos, es un modelo opt-in: nadie ve el dashboard financiero salvo que se le active explícitamente (hoy `createFirstAdmin` se lo activa al admin inicial). [config/access-manager.js](config/access-manager.js).
- [x] **`stats.router.js` — primer router reactivado end-to-end**: `checkAction('VIEW_STATS')` activo en `GET /stats/stats` y `GET /stats/budget/:code`. **Probado contra la API real**: usuario con `allowReports:true` → `200`; usuario con `allowReports:false` → `403 Acceso denegado a la acción: VIEW_STATS`. [routes/stats.router.js](routes/stats.router.js).
- [ ] **Otros objetos referenciados por `checkAction` en los routers que aún no existen en `MODULE_HIERARCHY.objects`, ni con el fix de mayúsculas** — hay que resolverlos antes de reactivar esos routers concretos:
  - `VERIFACTU` (`verifactulogs.router.js`, `checkAction('VIEW_VERIFACTU')`) no coincide con el nombre real del objeto, `verifactuLogs` — no es un problema de mayúsculas, es un nombre distinto. Hay que alinear uno de los dos lados.
  - `SALES` como objeto genérico (`documentTax.router.js`, `checkAction('VIEW_SALES')`) — `SALES` es la clave del módulo, no un objeto dentro de él; el propio comentario del código ("permiso más genérico si lo prefieres") ya admite que es un placeholder sin resolver.
- [ ] **`checkAction` sigue comentado en el resto de routers** (`users`, `customers`, `vendors`, `products`, `salesBudgets`/`salesBudgetLines`, `salesInvoices`/`salesInvoiceLines`, `salesPostInvoice*`, `purchInvoice*`, `purchPostInvoice*`, `seriesNumber`, `verifactuLogs`, `operatingExpenses`, `documentTax`, `config`). Solo hay autenticación JWT (donde existe, ver más abajo); cualquier usuario autenticado puede CRUD cualquier recurso vía API. `stats.router.js` (arriba) es el único ya reactivado.
- [ ] **`libs/router-factory.js` (`protectedRoute`) — único router que lo usa (`company.router.js`) lo tiene también comentado por completo, incluida la autenticación**, no solo la autorización (ver hallazgo crítico más abajo). Ningún router usa hoy `protectedRoute` de forma activa. [libs/router-factory.js](libs/router-factory.js), [routes/company.router.js](routes/company.router.js).
- [ ] **Endpoints montados y sin ningún `passport.authenticate`, no solo sin autorización granular:**
  - `routes/company.router.js` — CRUD completo de la empresa (`GET/POST/PATCH/DELETE`) accesible sin token.
  - `routes/conexion.router.js` — lectura y escritura de configuración de conexión accesible sin token.
  - `routes/enums.router.js` — lectura de valores de enumeración por modelo/campo accesible sin token (impacto menor, solo lectura de metadatos, pero rompe la asunción de "todo lo que no es setup/license/login exige JWT").
  - Esto contradice la asunción de que "la autenticación JWT está activa en todas partes, solo falta la autorización granular" — en estos tres routers falta también la autenticación. **Sigue sin corregir** (fuera de alcance del trabajo de esta iteración, centrado en el flujo de login).
- [ ] Roles declarados de forma inconsistente en 3 sitios y desincronizados:
  - `config/access-manager.js#ROLES` ya no incluye `'master'` (tiene `ADMIN, FINANCIERO, VENDEDOR, EXTERNO, VIEWER, SYSTEM`), pero `services/user.service.js#ROLES` sigue incluyendo `'master'` como rol válido de negocio. [config/access-manager.js](config/access-manager.js#L1-L8), [services/user.service.js](services/user.service.js#L12).
  - `ROLE_ACTIONS` en `access-manager.js` no tiene entrada para `'master'`: si se reactiva `checkAction`, cualquier usuario con ese rol quedaría sin ningún permiso (`checkPermission` devuelve `false` para todas las acciones).
  - El campo `role` en `schemas/user.schema.js` es texto libre (`Joi.string().min(5)`), sin lista cerrada de valores válidos — cualquier string de 5+ caracteres se acepta al crear/editar un usuario, sin relación con los roles reales de `access-manager.js`.
- [ ] Módulos de la licencia (`license.modules`) no se cruzan todavía con `MODULE_HIERARCHY` de `access-manager.js` — la licencia hoy solo gatea "¿puede esta instalación usar la API?", no qué módulos concretos puede usar.
- [x] Middleware `checkAction`/`checkRole` implementado y funcional en `middlewares/auth.handler.js` (correcto en sí mismo, el problema es que no se invoca desde los routers). [middlewares/auth.handler.js](middlewares/auth.handler.js).
- [x] Puerta de licencia/trial (`licenseGate`) aplicada globalmente antes de todas las rutas de negocio, con exención explícita para `/setup`, `/license`, `/users/login*` y `/users/forgot-password*` (añadida al implementar el reseteo de contraseña: un usuario con el trial caducado debe poder recuperar el acceso a su cuenta igual que puede hacer login). [middlewares/licenseGate.js](middlewares/licenseGate.js), [routes/index.js](routes/index.js#L37-L39).

## Auditoría (trazabilidad de cambios)

- [ ] `POST /users` (creación) no pasa `userExecutor` al service — el router llama `service.create(req.body)` sin el ejecutor autenticado. [routes/users.router.js](routes/users.router.js).
- [ ] `PATCH /users/:id` (actualización) tampoco pasa `userExecutor` — el router llama `service.update(id, req.body)` sin él, aunque el método del service ya acepta ese parámetro. [routes/users.router.js](routes/users.router.js), [services/user.service.js](services/user.service.js).
- [x] `routes/conexion.router.js` sí propaga `userExecutor` (`req.user?.id || 'system'`) a su service — es la excepción, no la norma. [routes/conexion.router.js](routes/conexion.router.js#L30).

## Configuración y secretos

- [x] `docker-compose.yml` sin contraseñas literales — todo se lee de variables de entorno (`DB_USER`, `DB_PASSWORD`, `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`, `JWT_SECRET`, `AES_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `TRIAL_DURATION_DAYS`). [docker-compose.yml](docker-compose.yml).
- [x] `pgAdmin` movido a un profile de Compose (`profiles: [dev]`) — no se levanta con el `docker compose up` que se instala en cliente, solo con `--profile dev`; su puerto además quedó restringido a `127.0.0.1:5050` en vez de expuesto a toda la red. [docker-compose.yml](docker-compose.yml).
- [x] `.env.example` con solo placeholders (`CHANGE_ME_...`), sin secretos reales, y `NODE_ENV` documentado explícitamente (sustituye a un `APP_ENV` duplicado que no estaba conectado a nada en el código). [.env.example](.env.example).
- [x] `db/config.js` (usado por `sequelize-cli`) corregido — importaba `config` de un módulo que solo exporta `getConfig`; cualquier comando de migración crasheaba. [db/config.js](db/config.js).
- [ ] Sin `helmet` (u otro middleware de cabeceras de seguridad HTTP: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.). No está en `package.json` ni referenciado en `index.js`.
- [ ] CORS con whitelist hardcodeada a `http://localhost:8080` en código, sin variable de entorno. [index.js](index.js#L35-L44).
- [ ] Sin logging de seguridad estructurado para intentos de acceso denegado — `checkAction` solo hace `console.warn` (no pasa por Winston), y hoy es inalcanzable porque está deshabilitado en todos los routers.

## Licenciamiento y arranque comercial

- [x] Fin del usuario maestro por variables de entorno — `index.js` ya no siembra ningún usuario al arrancar.
- [x] `GET /setup/status` (`needsSetup` + estado de licencia) y `POST /setup/first-admin` sin autenticación (por diseño: solo funcionan con la BD vacía), exentos de `licenseGate`. **Probado**: `needsSetup` pasa de `true` a `false` correctamente tras crear el primer admin. [routes/setup.router.js](routes/setup.router.js).
- [x] `POST /users/login` responde `428 Precondition Required` explícito si no hay ningún usuario todavía, en vez de un `401` genérico. [services/user.service.js](services/user.service.js).
- [x] Trial de 15 días contado en `license_state` (fila única), inicializado una sola vez al arrancar. **Probado**: instalación nueva reporta `TRIAL` con `daysRemaining: 15`. [services/license.service.js](services/license.service.js), [db/models/licenseState.model.js](db/models/licenseState.model.js).
- [x] Licencias como JWT firmado RS256 (`noxiva-control-licensing`), verificadas por firma + huella de máquina + caducidad antes de aceptarse. [services/license.service.js](services/license.service.js).
- [x] Huella de máquina (`libs/fingerprint.js`) vía `node-machine-id` + SHA-256; en Docker requiere montar `/etc/machine-id` del host (ya hecho en `docker-compose.yml`). [libs/fingerprint.js](libs/fingerprint.js).
- [x] Clave privada de firma de licencias fuera del repo (`license-generator/keys/private.pem`, en `.gitignore`, confirmado que `git add` no la recoge); solo la clave pública de verificación se versiona (`config/license-public-key.pem`). [license-generator/](license-generator/).
- [x] `middlewares/licenseGate.js` bloquea con `402 Payment Required` toda la API si no hay licencia válida ni trial vigente, con exención explícita para no bloquear login/reseteo de contraseña/activación. [middlewares/licenseGate.js](middlewares/licenseGate.js).
- [ ] Licencia sin mecanismo de revocación — un token firmado es válido hasta su `exp` pase lo que pase (p. ej. un impago no la invalida antes de tiempo). Aceptado como limitación de v1.
- [ ] `license.modules` no se usa todavía para restringir funcionalidad dentro de la instalación (ver "Control de accesos" arriba).

## Envío de email (OTP)

- [x] Envío vía API HTTP de Resend con `fetch` nativo de Node 18 (sin SMTP, sin dependencia nueva de cliente de correo). [libs/mailer.js](libs/mailer.js).
- [x] Fallo de envío se traduce en `502 Bad Gateway` explícito para el cliente, y la causa real queda en el log interno (Winston) — ver detalle en "Autenticación". [services/otp.service.js](services/otp.service.js).
- [x] `RESEND_API_KEY` ausente lanza error explícito en vez de intentar enviar sin credenciales. [libs/mailer.js](libs/mailer.js#L12-L14).
- [ ] **Dominio de envío sin verificar en Resend** — la cuenta de Resend en uso no tiene ningún dominio propio verificado todavía, así que está en modo sandbox: solo puede enviar al email dueño de la cuenta Resend, con remitente `onboarding@resend.dev`. **Bloqueante para producción**: ningún cliente real podría recibir un OTP hasta verificar un dominio propio (p. ej. `horebsl.es`) en resend.com/domains y actualizar `MAIL_FROM`. No requiere cambio de código, solo configuración DNS + `.env`.

---

## Pendiente operativo (no es código)

- [ ] **Verificar un dominio propio en Resend** (resend.com/domains) y actualizar `MAIL_FROM` en cada entorno — mientras tanto el login/reseteo por email solo funciona en sandbox contra la cuenta propietaria de Resend.
- [ ] Ejecutar `npm run migrations:run` contra cada base de datos real. Nota: durante esta iteración se comentó y luego se renombró a `.js.bak` toda migración no relacionada con `users`/`login_otps`/`license_state`, para aislar y probar el flujo de login sin depender del resto del esquema — hay que revertir eso (devolver la extensión `.js`) antes de dar por completo el resto de módulos.
- [ ] Rotar manualmente credenciales reales (Postgres, pgAdmin) expuestas en el historial de git.
- [ ] Integración del frontend con el contrato de login — ya documentado en detalle en [docs/AUTH_LOGIN_CONTRACT.md](docs/AUTH_LOGIN_CONTRACT.md) (setup/status, login, forgot-password, manejo de `402`). Pendiente de que el equipo de frontend lo consuma (repo aparte).

---

## Prioridad sugerida de lo pendiente

1. **Operativo inmediato — verificar dominio en Resend**: sin esto, el login/reseteo por email no funciona para ningún usuario real fuera de la cuenta de pruebas.
2. **Crítico — autenticación faltante en `company.router.js` y `conexion.router.js`**: añadir `passport.authenticate('jwt', {session:false})` como mínimo (antes de decidir sobre `checkAction`). Sigue siendo el hallazgo de mayor impacto sobre el código: dos recursos de negocio accesibles sin ningún token.
3. **Fase 1 — Autorización**: reactivar `checkAction` (o migrar a `protectedRoute`) en todos los routers, empezando por unificar `ROLES`/`ROLE_ACTIONS` entre `access-manager.js` y `user.service.js` (resolver el caso `'master'`) para no dejar un rol real sin permisos al reactivar.
4. **Fase 2 — Ciclo de vida de credenciales**: política de contraseñas real (complejidad, no solo longitud), invalidación de tokens (`tokenVersion` — más relevante ahora que existe reseteo de contraseña sin invalidar sesiones previas).
5. **Fase 3 — Endurecimiento transversal**: `helmet`, CORS parametrizado por entorno, propagar `userExecutor` en `users.router.js` (create/update), logging de seguridad estructurado (Winston) para accesos denegados.
