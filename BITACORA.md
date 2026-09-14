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

### Para continuar (de la sesión de "Maestros restantes")

1. Router de `users`: sigue con `checkAction` comentado y es el que más lógica de permisos especiales necesita (autogestión del propio usuario vs. gestión de otros).
2. `conexion.router.js`/`enums.router.js` siguen sin autenticación — hallazgo crítico abierto, independiente de cualquier entidad.
3. Verificar dominio propio en Resend — sigue bloqueando onboarding de cliente real.

---

### Módulos activables, configuración Veri*factu y activación completa del flujo de ventas

Sesión larga, en el mismo día. Tres bloques de trabajo encadenados a partir de peticiones del usuario ("categoría de proveedores para servicios", "Veri*factu debe ser activable", "por qué no se pueden crear ofertas").

**1. Categoría de vendors unificada con operating_expenses/purchInvoice/purchPostInvoice.**
Un proveedor se usa tanto para compras de obra como para gasto interno recurrente (luz, alquiler...), pero `vendors.category` solo tenía categorías de obra y `operating_expenses.category` un set de gasto interno totalmente distinto — el autofill de categoría al buscar un proveedor desde gastos internos nunca casaba. Unificado en un único enum de 11 valores (unión de ambos sets) en las 4 tablas. `vendors` ya tenía datos/tabla activa → migración nueva `align_vendor_category_enum.js` con `ALTER TYPE ADD VALUE`. Las otras 3 siguen en `.bak`, se les actualizó el enum en el propio fichero para que nazcan ya alineadas cuando se activen.

**2. `module_config` (nueva tabla) — módulos on/off, genérico y reutilizable.**
CRUD completo (`key` en mayúsculas como PK, no autonumerada) siguiendo el patrón de `company`. `services/moduleConfig.service.js#isEnabled(key)` es el punto único de consulta; ya conectado de verdad en `salesPostInvoice.service.js` (el registro Veri*factu solo se genera si `VERIFACTU` está activo). Semilla: `VERIFACTU` nace `enabled=true` (preserva el comportamiento previo, que era obligatorio).

**3. `verifactu_config` (nueva tabla) — modo local vs. proveedor externo.**
`useProvider` (boolean) + `providerName`/`apiBaseUrl`/`apiKey`/`apiSecret`, obligatorios solo si `useProvider=true` (Joi `.when`). `apiSecret` cifrado en reposo (`libs/crypto.js`, AES-256-GCM) — primer consumidor real de `AES_SECRET`, que estaba en el `.env` sin usar. **La llamada HTTP real al proveedor NO está implementada**, solo el almacenamiento de la config (`getActiveConfig()` queda listo para cuando se construya).

**4. `routes/verifactu.router.js` (exportación de XML) — estaba roto y sin montar.**
Importaba `services/verifactu.service.js`, que no existe (el real es `verifactulogs.service.js`); hacía `JSON.parse()` sobre un JSONB que Sequelize ya entrega parseado; sin autenticación; no montado en `routes/index.js`. Corregido, protegido con `VIEW_VERIFACTULOGS`, y ahora marca `exportedAt` en el log al descargar. Frontend: IPC dedicado `export-verifactu-xml` (mismo patrón que `write-excel-file`) + botón "DESCARGAR XML" en el listado de logs.

**5. Navegación directa a ficha para tablas de registro único.**
`company` y `verifactu_config` ahora abren la ficha directamente desde el sidebar (`sidebar.singleton: true` en `document-schema.mjs`, resuelto en `sidebar.js#openSingletonEditor`) en vez de pasar por el Explorer — consultan si ya existe un registro (modo VER) o no (modo NUEVO).

**6. Activación completa del flujo de ventas (oferta → factura de venta → factura de venta registrada).**
Causa raíz de "no se pueden crear ofertas": **ninguna tabla de la cadena de ventas existía** (`sales_budgets`, `sales_budget_lines`, `sales_invoices`, `sales_invoice_lines`, `sales_post_invoices`, `sales_post_invoice_lines`, `document_taxes`, `verifactu_logs` — las 8, todas en `.bak`). Restauradas todas (mismo proceso que `customers`: contenido revisado contra el modelo antes de aplicar). `checkAction` reactivado en `salesBudgets`, `salesBudgetLines`, `salesInvoices`, `salesInvoiceLines`, `salesPostInvoice`, `salesPostInvoiceTax`, `verifactulogs`.

Bugs reales encontrados de paso (no eran solo tablas ausentes):
- `verifactulogs.router.js` usaba `VIEW_VERIFACTU`/`UPDATE_VERIFACTU` (el objeto registrado en `MODULE_HIERARCHY.SALES` es `verifactuLogs` → debía ser `VIEW_VERIFACTULOGS`). Si se activaba `checkAction` tal cual, bloqueaba a todo el mundo siempre. Corregido antes de descomentar.
- `salesBudget.model.js`: hook `beforeValidate` llamaba a `uuidv4()` sin importar (solo existía `randomUUID` de `crypto`) — código muerto en la práctica porque `movementId` ya tiene `defaultValue`, pero una bomba si algún día fallaba ese default. Corregido.
- `salesBudget.model.js` y `salesInvoice.model.js` no tenían el campo virtual `selectedSerie` (sí lo tienen `Customer`/`Vendor`) — la serie elegida en el formulario se descartaba en silencio al crear (`generateNextCode` caía siempre al fallback "cualquier serie activa del tipo"). Añadido.
- **`salesBudgets.service.js#update()` — bug grave**: usaba una variable `lines` que nunca se declaró (la desestructuración es `rawLines`). Cualquier intento de editar una oferta ya creada tiraba `ReferenceError`. Corregido (2 sitios).
- `salesBudgetLines.schema.js` / `salesInvoiceLine.schema.js` **no incluían `width`/`height`** (sí existen en modelo/tabla) — Joi rechaza claves no declaradas por defecto, así que cualquier guardado con líneas fallaba con "datos no válidos" en cuanto se activaron las tablas. Añadidos como condicionales.
- `libs/taxCalculation.js` reenviaba `quantityUnitMeasure` crudo (puede llegar `null` desde el front) hacia el `INSERT`, pero esa columna es `NOT NULL` — habría roto igual aunque Joi lo permitiera. Normalizado al valor ya calculado (factor 1 por defecto).

**7. Regla de negocio: campos de línea obligatorios según unidad de medida.**
`quantityUnitMeasure` obligatorio solo si `unitMeasure='METRO'`; `width`+`height` obligatorios solo si `unitMeasure='METRO2'`; el resto de unidades no los piden. Implementado con `Joi.when('unitMeasure', ...)` en ambos schemas de líneas (budget/invoice) y replicado en el frontend (`transactionLinesHandler.js#validate()`, antes un no-op que nunca validaba nada — ni siquiera descripción/cantidad/precio, que sí son siempre obligatorios).

**8. Otro bug de UI encontrado (patrón "guardar no hace nada" sin ningún aviso)**: `fields-budget-handler.js` usaba `alert()` nativo (inconsistente, posiblemente invisible en la ventana Electron) en vez del patrón `validate()`/`getValidationError()` ya establecido; `fields-salesinvoice-handler.js` tenía `validate()` pero **nunca lo exponía en el objeto público** que lee `transaction.js`, así que `hError` siempre era `null` y un fallo de validación interna hacía `return` en silencio. Ambos corregidos.

**No verificado en vivo con sesión real** (bloqueo de política del entorno para firmar un JWT de prueba esta sesión) — pendiente que el usuario cree una oferta completa desde la app y confirme.

### Migraciones activas ahora (acumulado)

`users`, `login_otps`, `license_state`, `customers`, `series_numbers`, `vendors`, `products`, `company`, `module_config`, `verifactu_config`, `sales_budgets`, `sales_budget_lines`, `sales_invoices`, `sales_invoice_lines`, `sales_post_invoices`, `sales_post_invoice_lines`, `verifactu_logs`, `document_taxes`.

**Siguen en `.bak`**: `operating_expenses`, `purch_invoice(_line)`, `purch_post_invoice(_line)`. Candidata natural siguiente: compras (`purchInvoice`/`purchPostInvoice`), simétrica a ventas — probablemente con los mismos tipos de bugs (revisar `selectedSerie` virtual, variables `lines`/`rawLines`, `width`/`height` en schemas de líneas, nombres de `checkAction`).

### Para continuar

1. Activar compras (`purch_invoices`, `purch_post_invoices` y sus líneas) — mismo patrón que ventas, revisar los mismos puntos de bug ya vistos ahí antes de dar por bueno el `checkAction`.
2. Activar `operating_expenses` — su enum de categoría ya está alineado desde el bloque 1, solo falta la migración.
3. `documentTax.router.js` sigue con `checkAction` comentado — es un endpoint genérico para cualquier tipo de documento (`budget`/`salesinvoice`/`purchinvoice`...), no encaja en un único permiso fijo; decidir el criterio antes de activarlo.
4. Implementar el envío real a un proveedor externo de Veri*factu cuando `verifactu_config.useProvider=true` — hoy solo se guarda la configuración, no hay llamada HTTP.
5. Probar contra la API real con sesión de usuario (crear oferta completa, aprobarla, facturarla, registrarla) — no se pudo esta sesión.
6. Seguir afinando reglas de negocio de líneas de venta a medida que el usuario las vaya probando (por ahora: descripción/cantidad/precio siempre, factor/ancho/alto según unidad).

---

## 2026-09-15

### Selector de líneas de presupuesto en factura de venta

Al elegir un presupuesto en la cabecera de una factura de venta, se abre un modal con las líneas de ese presupuesto y su cantidad pendiente de facturar (ya facturado se calcula contra `sales_post_invoice_lines`, el histórico definitivo, con el mismo criterio F1/F2 suma / R1-R5 resta que `saldoFacturado`). Al confirmar la selección, cada línea se inserta en la factura con **cantidad = pendiente**, editable por si se quiere facturar menos.

- Columna nueva `budget_line_no` en `sales_invoice_lines` y `sales_post_invoice_lines` (se propaga al registrar). Nuevo endpoint `GET /salesBudgetLines/:codeDocument/pending` (`services/salesBudgetsLines.service.js#getPendingLines`).
- De paso, `salesPostInvoice.service.js#create()` (el bulk-insert manual al registrar) **tampoco copiaba `width`/`height`** — una factura con líneas en METRO2 perdía esos datos al pasar a histórico definitivo. Corregido en el mismo sitio.
- 2 bugs de UX corregidos tras probarlo: (1) la línea en blanco por defecto se quedaba vacía delante de las insertadas desde el modal — nuevo `linesHandler.removeEmptyLines()`, se llama antes de insertar; (2) el desplegable de presupuesto mostraba el nombre del **cliente** (así lo guarda `salesBudget.name`, copiado de la cabecera) en vez del código del presupuesto — `renderDependentSelect` ahora acepta qué campo mostrar.

### Facturas de venta registradas — solo lectura, cumplimiento AEAT

`routes/salesPostInvoice.router.js` solo tenía GET, pero además tenía un `POST /` directo que **saltaba por completo el flujo real de archivado** (`archiveInvoice()` llama al servicio en proceso, no por HTTP — ese POST era una puerta trasera para fabricar una "factura registrada" sin pasar por el encadenamiento de huella Veri*factu). Quitado. Añadido un rechazo explícito para `POST`/`PATCH`/`PUT`/`DELETE` — `403` para cualquier usuario autenticado, sin depender de rol ni de `checkAction` (deliberado: no debe poder eliminarla **ningún perfil**, ni siquiera admin). Frontend: el botón "EDITAR" ya no se muestra en páginas inmutables (antes se mostraba y no hacía nada al pulsarlo).

### Línea de tipo PRODUCTO / COMENTARIO

Campo `type` nuevo en las 5 tablas de líneas (`sales_budget_lines`, `sales_invoice_lines`, `sales_post_invoice_lines`, y en los `.bak` de compras para que nazcan ya con él). COMENTARIO = solo texto libre en `description`, el resto de campos no se exige (Joi condicional por `type`, igual patrón que el condicional por `unitMeasure` de ayer) y no suma a los totales (`libs/taxCalculation.js` la trata aparte, verificado con una línea mixta). En el frontend, al marcar una línea como COMENTARIO se deshabilitan y limpian sus demás campos (`transactionLinesHandler.js#applyLineTypeState`), y se reactivan si se vuelve a PRODUCTO.

### Migraciones activas ahora (acumulado)

Añadidas hoy sobre la lista de ayer: sin tablas nuevas, solo columnas (`budget_line_no` y `type` en `sales_invoice_lines`/`sales_post_invoice_lines`; `type` en `sales_budget_lines`). Compras y `operating_expenses` siguen en `.bak`, ya con `type` incluido en su contenido.

### Para continuar

1. Probar en la app real: seleccionar líneas del modal de presupuesto, y cambiar el tipo de una línea entre PRODUCTO/COMENTARIO — no se pudo verificar interactivamente esta sesión (misma limitación de firmar JWT de prueba de siempre).
2. Sigue pendiente activar compras y `operating_expenses` (ver sesión anterior) — ahora ya heredarían `type`/`budget_line_no` (este último no aplica a compras) desde el primer día si se activan.
3. El resto de puntos "para continuar" de la sesión anterior (proveedor externo Veri*factu, `documentTax.router.js` sin `checkAction`) siguen abiertos, sin tocar hoy.
