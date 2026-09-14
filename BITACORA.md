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

---

## 2026-09-14

### Maestros restantes (proveedores, productos, empresa) — mismo patrón que clientes, activados los tres

Se replicó en bloque el patrón ya rodado con `customers` sobre los tres maestros que quedaban: `vendors`, `products` y `company`.

- **`checkAction` activado** en los 6 endpoints de `vendors.router.js`, los 6 de `product.router.js` y los 6 de `company.router.js` (antes: comentado en los dos primeros, y en `company.router.js` incluso la propia autenticación JWT estaba comentada — CRUD completo de la empresa abierto sin token, era el hallazgo crítico abierto desde ayer). `company.router.js` ya traía `libs/router-factory.js#protectedRoute` importado sin usar; simplemente se descomentaron las 6 llamadas en vez de reescribir el stack a mano.
- No hizo falta tocar `config/access-manager.js#MODULE_HIERARCHY` — `vendors`, `products` (bajo `GESTION`) y `company` (bajo `SETUP`) ya estaban registrados ahí desde antes de que existiera `checkAction` en ningún router; el bug de mayúsculas de ayer ya los cubría.
- El bug de auditoría (`req.user.userId || req.user.sub` → `req.user.code`) **ya estaba corregido de una sesión anterior** en `vendors.router.js` y `product.router.js` — no hizo falta tocarlo. `company` no tiene campo `username`/auditoría en su modelo, no aplica.
- **`saldoFacturado`/`saldoPendiente` replicado en `vendors.service.js`**, análogo al de clientes pero contra `purch_post_invoices` (proveedores tienen facturas de compra, no de venta) — mismo criterio F1/F2 netas de R1-R5, mismo *fallback* a `0` si la tabla no existe. Confirmado que `purchPostInvoice.model.js` usa exactamente los mismos campos/enums (`typeInvoice`, `status: 'Abierto'`, `amount_with_vat`, `entityCode`) que `salesPostInvoice`, así que el cálculo es simétrico sin adaptaciones. No se replicó para `products` ni `company` — no tienen facturas asociadas, el concepto no aplica.
- **Bug de forma de respuesta corregido en `vendors.router.js` (`POST /`)**: el `catch` de `SequelizeUniqueConstraintError` respondía a mano con `res.status(409).json({success, message, error: error.errors})`, saltándose el `errorHandler` global y rompiendo el contrato `{success, statusCode, error, message}` que se fijó ayer para toda la app. Cambiado a `next(boom.conflict(...))`, igual que `customers.router.js`. Se añadió el mismo manejo (que no existía) en `product.router.js`.
- **Migraciones restauradas**: `20250531093856-create_vendor_table.js`, `20210830181610-create_product_table.js`, `20250706135042-company_table.js` (quitado el `.bak` del nombre **y** el bloque `/* ... */` que además envolvía el contenido). Las tres son autocontenidas (sin FK a tablas aún en `.bak`), aplicadas sin incidencias con `docker compose up -d --build backend` (Umzug las corrió solo al arrancar). Siguen en `.bak`: `sales_*`, `purch_invoice(_line)`, `purch_post_invoice(_line)`, `verifactu_logs`, `document_taxes`, `operating_expenses` — por eso el saldo de proveedores hoy siempre da `0` en la práctica (degrada correctamente, no rompe nada).
- **Probado contra la API real** (usuario admin real `apruebas` vía JWT minteado a mano, más un usuario `externo` desechable creado y borrado en la misma sesión):
  - Sin token: `GET /company` → `401` (antes `200`).
  - Rol `externo` (solo lectura): `POST /vendors` → `403 CREATE_VENDORS`; `DELETE /products/:code` → `403 DELETE_PRODUCTS`; `PATCH /company/:id` → `403 UPDATE_COMPANY`; lectura (`vendors-paginated`) → `200`.
  - `VendorService.getBalances()` probado directo (sin API) contra un código inexistente con `purch_post_invoices` aún sin crear → degrada a `{saldoFacturado:0, saldoPendiente:0}` sin lanzar error, igual que clientes.
- **No tocado a propósito** (son hallazgos, no ajustes ya hechos en `customers` que tocara replicar): `updateVendorSchema` tiene el mismo problema que `updateCustomerSchema` (fuerza reenviar todos los campos en el `PATCH`, no es un parcial real) — sigue sin resolver en clientes, así que no se replicó el fix en proveedores. `updateProductSchema` y `updateCompanySchema` ya eran parciales reales (`.min(1)` / todo opcional) desde antes, no tenían este problema.
- `SEGURIDAD.md` actualizado (sección "Control de accesos", nota de migraciones `.bak`, prioridad sugerida) y fecha de revisión movida a hoy.

### Para continuar

1. Router de `users`: sigue con `checkAction` comentado y es el que más lógica de permisos especiales necesita (autogestión del propio usuario vs. gestión de otros).
2. Antes de tocar `verifactuLogs`/`documentTax`: resolver los mismatches de nombre ya documentados (`VERIFACTU`→`verifactuLogs`, `SALES` genérico).
3. `conexion.router.js`/`enums.router.js` siguen sin autenticación — hallazgo crítico abierto, independiente de cualquier entidad.
4. Verificar dominio propio en Resend — sigue bloqueando onboarding de cliente real.
