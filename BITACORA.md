# BITÁCORA.md

Registro de sesiones de trabajo sobre el backend de Horeb, pensado para retomar exactamente donde se dejó — no repetir análisis ya hecho. Complementa a [SEGURIDAD.md](SEGURIDAD.md) (estado de seguridad, con checkboxes) y [docs/AUTHORIZATION_ARCHITECTURE.md](docs/AUTHORIZATION_ARCHITECTURE.md) (cómo funciona el sistema de permisos): aquí se registra el **avance día a día**, ahí el **estado final** de cada cosa.

---

## 2026-09-13

### Autenticación — cerrada

- Login en dos pasos (password + OTP), reseteo de contraseña sin sesión previa ("olvidé mi contraseña"), rate limiting, todo probado de extremo a extremo contra la API real.
- Contrato documentado para el frontend en [docs/AUTH_LOGIN_CONTRACT.md](docs/AUTH_LOGIN_CONTRACT.md).
- **Bloqueante operativo pendiente, no de código**: el dominio de envío de Resend no está verificado — el login/reseteo por email solo funciona en modo sandbox (`onboarding@resend.dev`, solo entrega a `startcrater@gmail.com`). Hay que verificar un dominio propio en resend.com/domains antes de poder dar de alta a un cliente real.

### Autorización — bug crítico arreglado, activación módulo por módulo en marcha

- **Bug crítico corregido** en `checkPermission` (`config/access-manager.js`): comparaba mayúsculas contra camelCase y denegaba siempre, para todos. Detalle completo en [docs/AUTHORIZATION_ARCHITECTURE.md](docs/AUTHORIZATION_ARCHITECTURE.md#7-bug-histórico-corregido-2026-09-13).
- Módulo `REPORTS` añadido, conectado al campo `allowReports` (existía en `User` pero no gateaba nada).
- **Routers con `checkAction` ya activo y probado**: `stats`, `customers`, `seriesNumber`.
- **Routers todavía con `checkAction` comentado** (autenticación JWT sí activa): `users`, `vendors`, `products`, `salesBudgets`/`salesBudgetLines`, `salesInvoices`/`salesInvoiceLines`, `salesPostInvoice*`, `purchInvoice*`, `purchPostInvoice*`, `verifactuLogs`, `operatingExpenses`, `documentTax`, `config`.
- **Sin autenticación siquiera** (crítico, no depende de ninguna otra entidad — se puede arreglar en cualquier momento): `company.router.js`, `conexion.router.js`, `enums.router.js` (este último, impacto menor).
- **Mismatches de nombres pendientes de resolver** antes de activar esos routers concretos: `VERIFACTU` vs `verifactuLogs` (nombre distinto, no es mayúsculas); `SALES` como objeto genérico en `documentTax.router.js` (es la clave del módulo, no un objeto).
- **Rol `'master'` sigue huérfano**: existe en `services/user.service.js#ROLES` pero no en `access-manager.js` — sin permisos si algún usuario lo tuviera.

### Módulo Clientes — analizado y con reglas de negocio activas

- `checkAction` activo en los 7 endpoints de `customers.router.js`.
- **Bug sistémico encontrado y corregido en 13 routers** (no solo clientes): `req.user.userId || req.user.sub` siempre era `undefined` (ese no es el shape de `req.user`, que es la instancia Sequelize del usuario) — la auditoría de usuario ejecutor nunca se registraba en ninguna escritura. Corregido a `req.user.code` en: `customers`, `operatingExpenses`, `product`, `purchInvoice`, `purchPostInvoice`, `purchInvoiceLines`, `salesBudgetLines`, `salesBudgets`, `salesInvoiceLines`, `salesInvoices`, `salesPostInvoice`, `seriesNumber`, `vendors`.
- **Nuevos campos calculados (no persistidos)**: `saldoFacturado` y `saldoPendiente`, agregados contra `sales_post_invoices` (F1/F2 netas de rectificativas R1-R5; pendiente = mismo cálculo solo sobre `status='Abierto'`). Degrada a `0` con aviso en el log mientras esa tabla no exista (evita romper el listado/detalle de clientes).
- **Hallazgos de cumplimiento normativo (AEAT/Veri*factu) sin resolver, pendientes de decisión**:
  - Falta `país`/`provincia` en el maestro de clientes — necesario para el bloque `IDOtro` de clientes extranjeros sin NIF español.
  - `nif` no valida formato/dígito de control, solo longitud.
  - **Hallazgo mayor, en el módulo de facturación, no en clientes**: `VerifactuXml.service.js` no genera el bloque `Destinatarios` del XML en absoluto — ningún dato del cliente viaja hoy en el XML de Veri*factu.
  - `updateCustomerSchema` fuerza a reenviar todos los campos en cada `PATCH` (no es un parcial real) y permite vaciar el `nif` que era obligatorio al crear.
- **Manejo de errores hacia el frontend, corregido a nivel global** (afecta a toda la app, no solo clientes): el `errorHandler` final filtraba mensajes internos crudos (nombres de tabla, detalles de Postgres) y devolvía una forma de JSON distinta a la de los errores boom. Ahora todo error, controlado o no, llega como `{success, statusCode, error, message}`; el detalle real sigue en `logs/error.log`.

### Migraciones activas hoy

`users`, `login_otps`, `license_state`, `customers`, `series_numbers`. **Todo el resto sigue en `.bak`** (renombradas, no borradas — contenido intacto, solo hay que quitarles `.bak` y reconstruir el contenedor para activarlas).

### Comandos de referencia usados hoy

```bash
# Aplicar migraciones tras restaurar una (renombrar quitando .bak primero)
docker compose up -d --build backend
docker logs server --tail 15

# Probar una regla de permisos en aislado, sin arrancar nada
node -e "
const { checkPermission } = require('./config/access-manager');
console.log(checkPermission({ role: 'admin', allowGestion: true }, 'VIEW_CUSTOMERS'));
"

# Mintar un JWT de prueba para un rol/usuario sin pasar por login+OTP (solo dev)
docker exec server node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign({ sub: 'CODIGO', role: 'vendedor' }, process.env.JWT_SECRET, { expiresIn: '5m' }));
"
```

### Para continuar mañana

1. **Elegir la siguiente entidad** — candidata natural: `vendors` (simétrico a `customers`, sin hallazgos de cumplimiento pendientes que yo haya visto todavía; revisar igual por si acaso).
2. Repetir el patrón ya rodado: revisar modelo/schema/service/router → activar `checkAction` → verificar en aislado (`checkPermission`) → restaurar migración si hace falta y probar contra la API real → documentar en `SEGURIDAD.md` + `AUTHORIZATION_ARCHITECTURE.md` → commit.
3. Cuando toque `verifactuLogs` y `documentTax`: resolver antes los mismatches de nombres (`VERIFACTU`→`verifactuLogs`, `SALES` genérico) — no van a funcionar con solo activar `checkAction`.
4. `company.router.js`/`conexion.router.js` sin autenticación: no depende de ninguna entidad, se puede hacer en cualquier momento que se decida priorizar (sigue como hallazgo crítico abierto).
5. Verificar dominio propio en Resend — bloqueante para poder onboardear un cliente real, independiente de todo lo anterior.
