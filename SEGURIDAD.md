# SEGURIDAD.md

Bitácora de seguridad del backend de Horeb (API Node/Express/Sequelize). Alcance: exclusivamente backend — autenticación, autorización, validación, persistencia y configuración del servidor. No cubre frontend, UI/UX ni infraestructura ajena a este repo (excepto lo estrictamente necesario para arrancar el servicio, p. ej. `docker-compose.yml`).

Cada punto usa una casilla de verificación:
- `- [x]` — implementado y verificado contra el código actual.
- `- [ ]` — pendiente, no implementado todavía.

Revisión realizada el 2026-09-13 contrastando este documento línea a línea con el estado real del repositorio (no con el historial de commits).

---

## Autenticación

- [x] Login en dos pasos (password + OTP por email) — `POST /api/v1/users/login` valida credenciales y no emite JWT; `POST /api/v1/users/login/verify-otp` verifica el código y emite el token. [routes/users.router.js](routes/users.router.js), [services/user.service.js](services/user.service.js), [services/otp.service.js](services/otp.service.js).
- [x] Reenvío de OTP con cooldown (45s) y máximo de reenvíos (3), y máximo de intentos (5) antes de quemar el reto. [services/otp.service.js](services/otp.service.js).
- [x] Código OTP generado con CSPRNG (`crypto.randomInt`), almacenado solo como hash SHA-256 (nunca en claro), comparado con `crypto.timingSafeEqual`. [services/otp.service.js](services/otp.service.js#L9-L22).
- [x] Contraseñas hasheadas con bcrypt (`beforeCreate`/`beforeUpdate` hooks, coste 10), nunca en claro. [db/models/user.model.js](db/models/user.model.js#L148-L159).
- [x] `JWT_SECRET` obligatorio — `getConfig()` lanza error y el proceso no arranca sin él; eliminado el fallback `'secret_key'`. [config/config.js](config/config.js#L57-L63).
- [x] `PATCH /users/update-password-initial/:id` requiere sesión JWT, solo permite `id === req.user.code`, y exige la contraseña actual verificada con bcrypt antes de aceptar la nueva. [routes/users.router.js](routes/users.router.js#L103-L122), [services/user.service.js](services/user.service.js#L172-L191).
- [x] Rate limiting en login (`loginLimiter`, 10 req/15min/IP) y en verificación/reenvío de OTP (`otpLimiter`, 20 req/5min/IP). [middlewares/rateLimiter.js](middlewares/rateLimiter.js).
- [x] Sin seed de usuario maestro con credenciales fijas — el primer usuario se crea vía `POST /api/v1/setup/first-admin` solo si la tabla `User` está vacía. [index.js](index.js#L82-L86), [routes/setup.router.js](routes/setup.router.js), [services/user.service.js](services/user.service.js#L137-L158).
- [x] Campos sensibles (`password`, `otp`, `securityKey`, `token`) redactados antes de escribirse en el log de errores. [middlewares/error.handler.js](middlewares/error.handler.js#L5-L14).
- [x] Payload del JWT minimizado (`sub`, `role`) — sin bloque `permissions` redundante que nunca se leía. [services/user.service.js](services/user.service.js#L101-L113).
- [ ] Tokens JWT sin mecanismo de revocación (`tokenVersion` o blacklist). Un token de 8h sigue siendo válido aunque se cambie la contraseña, se desactive el usuario o cambie el rol.
- [ ] Sin flujo de reseteo de contraseña para usuario sin sesión (olvido de contraseña). Solo existe cambio de contraseña autenticado.
- [ ] Rotación pendiente de credenciales reales (Postgres, pgAdmin) que estuvieron expuestas en el historial de git — no es un cambio de código, requiere rotarlas en la infraestructura real.

## Validación de entrada

- [x] Validación Joi en la mayoría de endpoints vía `validatorHandler(schema, 'body'|'params'|'query')`.
- [x] Esquema de OTP valida formato exacto (`guid` para `challengeId`, 6 dígitos numéricos para `otp`). [schemas/user.schema.js](schemas/user.schema.js#L24-L31).
- [ ] Política de contraseñas mínima — solo `min(8)`, sin exigir complejidad (mayúsculas, números, símbolos) ni lista de contraseñas comunes. Afecta a `createUserSchema`, `updateUserSchema`, `updateOwnPasswordSchema` y `createFirstAdminSchema`. [schemas/user.schema.js](schemas/user.schema.js#L6), [schemas/setup.schema.js](schemas/setup.schema.js#L6).

## Control de accesos (autorización)

- [ ] **`checkAction` (autorización por rol/módulo) está comentado en absolutamente todos los routers que lo referencian** (`users`, `customers`, `vendors`, `products`, `salesBudgets`/`salesBudgetLines`, `salesInvoices`/`salesInvoiceLines`, `salesPostInvoice*`, `purchInvoice*`, `purchPostInvoice*`, `seriesNumber`, `verifactuLogs`, `operatingExpenses`, `documentTax`, `config`, `stats`). Solo hay autenticación JWT (donde existe, ver más abajo); cualquier usuario autenticado puede CRUD cualquier recurso vía API. Verificado por grep sobre `routes/*.router.js`: 0 llamadas activas a `checkAction(...)`.
- [ ] **`libs/router-factory.js` (`protectedRoute`) — único router que lo usa (`company.router.js`) lo tiene también comentado por completo, incluida la autenticación**, no solo la autorización (ver hallazgo crítico nuevo más abajo). Ningún router usa hoy `protectedRoute` de forma activa. [libs/router-factory.js](libs/router-factory.js), [routes/company.router.js](routes/company.router.js).
- [ ] **Nuevo hallazgo (no documentado antes) — endpoints montados y sin ningún `passport.authenticate`, no solo sin autorización granular:**
  - `routes/company.router.js` — CRUD completo de la empresa (`GET/POST/PATCH/DELETE`) accesible sin token. [routes/company.router.js](routes/company.router.js).
  - `routes/conexion.router.js` — lectura y escritura de configuración de conexión accesible sin token. [routes/conexion.router.js](routes/conexion.router.js).
  - `routes/enums.router.js` — lectura de valores de enumeración por modelo/campo accesible sin token (impacto menor, es solo lectura de metadatos, pero rompe la asunción de "todo lo que no es setup/license/login exige JWT"). [routes/enums.router.js](routes/enums.router.js).
  - Esto contradice la asunción documentada hasta ahora de que "la autenticación JWT está activa en todas partes, solo falta la autorización granular" — en estos tres routers falta también la autenticación.
- [ ] Roles declarados de forma inconsistente en 3 sitios y desincronizados:
  - `config/access-manager.js#ROLES` ya no incluye `'master'` (tiene `ADMIN, FINANCIERO, VENDEDOR, EXTERNO, VIEWER, SYSTEM`), pero `services/user.service.js#ROLES` sigue incluyendo `'master'` como rol válido de negocio. [config/access-manager.js](config/access-manager.js#L1-L8), [services/user.service.js](services/user.service.js#L12).
  - `ROLE_ACTIONS` en `access-manager.js` no tiene entrada para `'master'`: si se reactiva `checkAction`, cualquier usuario con ese rol quedaría sin ningún permiso (`checkPermission` devuelve `false` para todas las acciones).
- [ ] Módulos de la licencia (`license.modules`) no se cruzan todavía con `MODULE_HIERARCHY` de `access-manager.js` — la licencia hoy solo gatea "¿puede esta instalación usar la API?", no qué módulos concretos puede usar.
- [x] Middleware `checkAction`/`checkRole` implementado y funcional en `middlewares/auth.handler.js` (correcto en sí mismo, el problema es que no se invoca desde los routers). [middlewares/auth.handler.js](middlewares/auth.handler.js).
- [x] Puerta de licencia/trial (`licenseGate`) aplicada globalmente antes de todas las rutas de negocio, con exención explícita solo para `/setup`, `/license` y `/users/login*`. [middlewares/licenseGate.js](middlewares/licenseGate.js), [routes/index.js](routes/index.js#L37-L39).

## Auditoría (trazabilidad de cambios)

- [ ] `POST /users` (creación) no pasa `userExecutor` al service — el router llama `service.create(req.body)` sin el ejecutor autenticado. [routes/users.router.js](routes/users.router.js#L158-L166).
- [ ] `PATCH /users/:id` (actualización) tampoco pasa `userExecutor` — el router llama `service.update(id, req.body)` sin él, aunque el método del service ya acepta ese parámetro. [routes/users.router.js](routes/users.router.js#L168-L182), [services/user.service.js](services/user.service.js#L160-L165).
- [x] `routes/conexion.router.js` sí propaga `userExecutor` (`req.user?.id || 'system'`) a su service — es la excepción, no la norma. [routes/conexion.router.js](routes/conexion.router.js#L30).

## Configuración y secretos

- [x] `docker-compose.yml` sin contraseñas literales — todo se lee de variables de entorno (`DB_USER`, `DB_PASSWORD`, `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`, `JWT_SECRET`, `AES_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `TRIAL_DURATION_DAYS`). [docker-compose.yml](docker-compose.yml).
- [x] `.env.example` con solo placeholders (`CHANGE_ME_...`), sin secretos reales. [.env.example](.env.example).
- [x] `db/config.js` (usado por `sequelize-cli`) corregido — importaba `config` de un módulo que solo exporta `getConfig`; cualquier comando de migración crasheaba. [db/config.js](db/config.js).
- [ ] Sin `helmet` (u otro middleware de cabeceras de seguridad HTTP: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.). No está en `package.json` ni referenciado en `index.js`. [package.json](package.json), [index.js](index.js).
- [ ] CORS con whitelist hardcodeada a `http://localhost:8080` en código, sin variable de entorno. [index.js](index.js#L35-L44).
- [ ] Sin logging de seguridad estructurado para intentos de acceso denegado — `checkAction` solo hace `console.warn` (no pasa por Winston), y hoy es inalcanzable porque está deshabilitado en todos los routers. [middlewares/auth.handler.js](middlewares/auth.handler.js#L26).

## Licenciamiento y arranque comercial

- [x] Fin del usuario maestro por variables de entorno — `index.js` ya no siembra ningún usuario al arrancar. [index.js](index.js#L82-L86).
- [x] `GET /api/v1/setup/status` (`needsSetup` + estado de licencia) y `POST /api/v1/setup/first-admin` sin autenticación (por diseño: solo funcionan con la BD vacía), exentos de `licenseGate`. [routes/setup.router.js](routes/setup.router.js).
- [x] `POST /api/v1/users/login` responde `428 Precondition Required` explícito si no hay ningún usuario todavía, en vez de un `401` genérico (evita enumeración y da una señal identificable al frontend). [services/user.service.js](services/user.service.js#L59-L71).
- [x] Trial de 15 días contado en `license_state` (fila única), inicializado una sola vez al arrancar. [services/license.service.js](services/license.service.js#L52-L54), [db/models/licenseState.model.js](db/models/licenseState.model.js).
- [x] Licencias como JWT firmado RS256 (`noxiva-control-licensing`), verificadas por firma + huella de máquina + caducidad antes de aceptarse. [services/license.service.js](services/license.service.js#L18-L43).
- [x] Huella de máquina (`libs/fingerprint.js`) vía `node-machine-id` + SHA-256; en Docker requiere montar `/etc/machine-id` del host (ya hecho en `docker-compose.yml`). [libs/fingerprint.js](libs/fingerprint.js), [docker-compose.yml](docker-compose.yml#L50-L54).
- [x] Clave privada de firma de licencias fuera del repo (`license-generator/keys/private.pem`, en `.gitignore`); solo la clave pública de verificación se versiona (`config/license-public-key.pem`). [license-generator/](license-generator/).
- [x] `middlewares/licenseGate.js` bloquea con `402 Payment Required` toda la API si no hay licencia válida ni trial vigente, con exención explícita para no bloquear el propio flujo de activación/login. [middlewares/licenseGate.js](middlewares/licenseGate.js).
- [ ] Licencia sin mecanismo de revocación — un token firmado es válido hasta su `exp` pase lo que pase (p. ej. un impago no la invalida antes de tiempo). Aceptado como limitación de v1.
- [ ] `license.modules` no se usa todavía para restringir funcionalidad dentro de la instalación (ver "Control de accesos" arriba).

## Envío de email (OTP)

- [x] Envío vía API HTTP de Resend con `fetch` nativo de Node 18 (sin SMTP, sin dependencia nueva de cliente de correo). [libs/mailer.js](libs/mailer.js).
- [x] Fallo de envío se traduce en `502 Bad Gateway` explícito, no en fallo silencioso. [services/otp.service.js](services/otp.service.js#L133-L147).
- [x] `RESEND_API_KEY` ausente lanza error explícito en vez de intentar enviar sin credenciales. [libs/mailer.js](libs/mailer.js#L12-L14).

---

## Pendiente operativo (no es código)

- [ ] Ejecutar `npm run migrations:run` contra cada base de datos real para aplicar `login_otps` y `license_state`.
- [ ] Dar de alta `RESEND_API_KEY` / `MAIL_FROM` en cada entorno — sin esas variables el login falla en el paso de envío de email.
- [ ] Rotar manualmente credenciales reales (Postgres, pgAdmin) expuestas en el historial de git.
- [ ] Integración del frontend con el contrato `GET /api/v1/setup/status` + manejo global de `402` (repo aparte, fuera del alcance de este documento).

---

## Prioridad sugerida de lo pendiente

1. **Crítico — autenticación faltante en `company.router.js` y `conexion.router.js`**: añadir `passport.authenticate('jwt', {session:false})` como mínimo (antes de decidir sobre `checkAction`). Es el hallazgo de mayor impacto de esta revisión: dos recursos de negocio están hoy accesibles sin ningún token.
2. **Fase 1 — Autorización**: reactivar `checkAction` (o migrar a `protectedRoute`) en todos los routers, empezando por unificar `ROLES`/`ROLE_ACTIONS` entre `access-manager.js` y `user.service.js` (resolver el caso `'master'`) para no dejar un rol real sin permisos al reactivar.
3. **Fase 2 — Ciclo de vida de credenciales**: política de contraseñas real (complejidad, no solo longitud), invalidación de tokens (`tokenVersion`), flujo de reseteo de contraseña sin sesión previa (reutilizando `otp.service.js` con `purpose: 'PASSWORD_RESET'`).
4. **Fase 3 — Endurecimiento transversal**: `helmet`, CORS parametrizado por entorno, propagar `userExecutor` en `users.router.js` (create/update), logging de seguridad estructurado (Winston) para accesos denegados.
