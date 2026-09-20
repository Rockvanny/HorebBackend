const ROLES = {
  ADMIN: 'admin',
  FINANCIERO: 'financiero',
  VENDEDOR: 'vendedor',
  EXTERNO: 'externo',
  VIEWER: 'viewer',
  // Rol pensado para la app móvil: operarios de campo que solo ven sus
  // tareas asignadas y actualizan su estado / suben un parte -sin acceso a
  // ningún módulo de gestión del Electron salvo que se le active a mano con
  // los flags allowX de siempre, igual que a cualquier otro rol-.
  OPERARIO: 'operario',
  SYSTEM: 'system'
};

const MODULE_HIERARCHY = {
  GESTION: {
    field: 'allowGestion',
    objects: ['customers', 'vendors', 'products', 'operatingExpenses', 'buildings']
  },
  SALES: {
    field: 'allowSales',
    objects: ['salesBudgets', 'salesInvoices', 'salesOverdueInvoices', 'salesPostInvoices', 'salesCreditNotes', 'verifactuLogs']
  },
  PURCHASES: {
    field: 'allowPurchases',
    objects: ['purchInvoices', 'purchOverDueInvoices', 'purchPostInvoices', 'purchCreditNotes']
  },
  SETUP: {
    field: 'allowSettings',
    objects: ['company', 'series', 'users', 'employees', 'conexion', 'moduleConfig', 'verifactuConfig']
  },
  REPORTS: {
    field: 'allowReports',
    objects: ['stats']
  }
};

const ACTIONS = {
  VIEW: 'view', CREATE: 'create', EDIT: 'edit', UPDATE: 'update', DELETE: 'delete', PRINT: 'print'
};

// 1. Configuración de Acciones (Permisos de ejecución)
const ROLE_ACTIONS = {
  [ROLES.ADMIN]: { default: Object.values(ACTIONS) },
  [ROLES.FINANCIERO]: {
    default: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.PRINT]
  },
  [ROLES.VENDEDOR]: {
    default: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.UPDATE, ACTIONS.PRINT]
  },
  [ROLES.VIEWER]: { default: [ACTIONS.VIEW, ACTIONS.PRINT] },
  [ROLES.EXTERNO]: { default: [ACTIONS.VIEW] },
  // A diferencia de VIEWER (solo lectura), OPERARIO necesita poder crear y
  // actualizar (subir un parte, cambiar el estado de su tarea) -pero sin
  // DELETE ni PRINT, que no pintan nada en un flujo de campo desde el móvil-.
  [ROLES.OPERARIO]: { default: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE] },
  [ROLES.SYSTEM]: { default: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.UPDATE, ACTIONS.DELETE] }
};

// 2. Configuración de Páginas (Visibilidad opcional)
// 'buildings' (Edificios) es admin-only: solo el admin gestiona altas de
// edificios/contratos de mantenimiento (ver buildings.router.js,
// checkRole('admin')). Como admin nunca tiene entrada en ROLE_PAGES, ve el
// array completo de MODULE_HIERARCHY.GESTION.objects sin restricción; el
// resto de roles con GESTION necesitan aquí su propio allowlist -sin
// 'buildings'- para que ni la API ni el menú del Frontend se lo muestren.
const GESTION_PAGES_WITHOUT_BUILDINGS = ['customers', 'vendors', 'products', 'operatingExpenses'];

const ROLE_PAGES = {
  [ROLES.FINANCIERO]: {
    // 'employees' (Empleados) decidido con el usuario 2026-09-20: solo
    // admin y financiero, igual que el resto de Configuración que ya tenía.
    SETUP: ['company', 'series', 'employees'],
    GESTION: GESTION_PAGES_WITHOUT_BUILDINGS
  },
  [ROLES.VENDEDOR]: {
    GESTION: GESTION_PAGES_WITHOUT_BUILDINGS
  },
  [ROLES.EXTERNO]: {
    GESTION: GESTION_PAGES_WITHOUT_BUILDINGS
  },
  [ROLES.VIEWER]: {
    GESTION: GESTION_PAGES_WITHOUT_BUILDINGS
  },
  [ROLES.OPERARIO]: {
    GESTION: GESTION_PAGES_WITHOUT_BUILDINGS
  }
};

const checkPermission = (user, actionString) => {
  if (!user || !actionString) return false;

  const userData = user.dataValues || user;
  const parts = actionString.split('_');
  const type = (parts.length > 1 ? parts[0] : 'VIEW').toUpperCase();
  const objectName = (parts.length > 1 ? parts.slice(1).join('_') : parts[0]).toUpperCase();

  // 1. Encontrar a qué módulo pertenece el objeto (ej. "COMPANY" -> "SETUP")
  // Comparación case-insensitive: `objectName` siempre llega en mayúsculas,
  // pero MODULE_HIERARCHY.objects usa camelCase (ej. 'salesBudgets'). Sin
  // esto, .includes(objectName) nunca casa con nada y checkPermission
  // deniega siempre, para cualquier usuario y cualquier acción.
  const moduleKey = Object.keys(MODULE_HIERARCHY).find(key =>
    MODULE_HIERARCHY[key].objects.some(o => o.toUpperCase() === objectName)
  );
  if (!moduleKey) return false;

  const moduleEntry = MODULE_HIERARCHY[moduleKey];

  // 2. Filtro 1: ¿Tiene el módulo activo en la base de datos?
  const val = (userData.modules && userData.modules[moduleEntry.field]) ?? userData[moduleEntry.field];
  const isModuleActive = [true, 1, "true", "1"].includes(val);
  if (!isModuleActive) return false;

  const userRole = (userData.role || '').toLowerCase();

  // 3. Filtro 2: Validar ROLE_PAGES (Visibilidad / Acceso a nivel de Página)
  const rolePages = ROLE_PAGES[userRole];
  if (rolePages && rolePages[moduleKey]) {
    // Si el rol tiene páginas personalizadas para este módulo, el objeto solicitado DEBE estar ahí
    // (mismo problema de mayúsculas que arriba: comparación case-insensitive)
    if (!rolePages[moduleKey].some(o => o.toUpperCase() === objectName)) {
      // Intento de acceder a la API de una página oculta (Ej: Financiero intentando acceder a USERS)
      return false;
    }
  }

  // 4. Filtro 3: Validar ROLE_ACTIONS (Permiso para ejecutar la acción)
  const roleActions = ROLE_ACTIONS[userRole];
  if (!roleActions) return false;

  // Verificamos si hay reglas específicas de acciones para este módulo en ROLE_ACTIONS
  // Ojo: usamos moduleKey ('SALES') en lugar de objectName para que coincida con nuestra estructura
  const allowedActions = roleActions.modules?.[moduleKey] || roleActions.default || [];

  return allowedActions.map(a => a.toUpperCase()).includes(type);
};

module.exports = {
  ROLES,
  checkPermission,
  MODULE_HIERARCHY,
  ROLE_ACTIONS,
  ROLE_PAGES,
  ACTIONS
};
