const ROLES = {
  ADMIN: 'admin',
  FINANCIERO: 'financiero',
  VENDEDOR: 'vendedor',
  EXTERNO: 'externo',
  VIEWER: 'viewer',
  SYSTEM: 'system'
};

const MODULE_HIERARCHY = {
  GESTION: {
    field: 'allowGestion',
    objects: ['customers', 'vendors', 'products', 'operatingExpenses']
  },
  SALES: {
    field: 'allowSales',
    objects: ['salesBudgets', 'salesInvoices', 'salesOverdueInvoices', 'salesPostInvoices', 'verifactuLogs']
  },
  PURCHASES: {
    field: 'allowPurchases',
    objects: ['purchases', 'purchaseInvoices', 'purchasePostInvoices', 'purchaseOverdueInvoices']
  },
  SETUP: {
    field: 'allowSettings',
    objects: ['company', 'series', 'users', 'conexion']
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
  [ROLES.SYSTEM]: { default: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.UPDATE, ACTIONS.DELETE] }
};

// 2. Configuración de Páginas (Visibilidad opcional)
const ROLE_PAGES = {
  [ROLES.FINANCIERO]: {
    SETUP: ['company', 'series']
  }
};

const checkPermission = (user, actionString) => {
  if (!user || !actionString) return false;

  const userData = user.dataValues || user;
  const parts = actionString.split('_');
  const type = (parts.length > 1 ? parts[0] : 'VIEW').toUpperCase();
  const objectName = (parts.length > 1 ? parts.slice(1).join('_') : parts[0]).toUpperCase();

  // 1. Encontrar a qué módulo pertenece el objeto (ej. "COMPANY" -> "SETUP")
  const moduleKey = Object.keys(MODULE_HIERARCHY).find(key =>
    MODULE_HIERARCHY[key].objects.includes(objectName)
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
    if (!rolePages[moduleKey].includes(objectName)) {
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
