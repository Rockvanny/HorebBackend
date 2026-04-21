// backend/config/access-control.js

const ROLES = {
    MASTER: 'master',
    ADMIN: 'admin',
    FINANCIERO: 'financiero',
    VENDEDOR: 'vendedor',
    EXTERNO: 'externo',
    VIEWER: 'viewer'
};

/**
 * 1. ASIGNACIÓN DE OBJETOS A MÓDULOS (Macro-permisos de BD)
 * Este mapa traduce el "objeto" que pide el front al "permiso de módulo" en la BD.
 */
const OBJECT_TO_MODULE = {
    // Pertenecen al módulo GESTIÓN
    'CUSTOMERS': 'allowGestion',
    'VENDORS': 'allowGestion',
    'PRODUCTS': 'allowGestion',

    // Pertenecen al módulo VENTAS
    'SALES': 'allowSales',
    'SALESINVOICES': 'allowSales',
    'SALESBUDGETS': 'allowSales',

    // Pertenecen al módulo COMPRAS
    'PURCHASES': 'allowPurchases',
    'PURCHINVOICES': 'allowPurchases',

    // Pertenecen al módulo CONFIGURACIÓN/ADMIN
    'USERS': 'allowSettings',
    'SETTINGS': 'allowSettings'
};

/**
 * 2. PERMISOS DE OBJETOS SEGÚN ROL (Micro-permisos de Acción)
 * Aquí defines qué acciones permite cada rol independientemente del módulo.
 */
const ACTION_RULES = {
    'VIEW': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR, ROLES.VIEWER, ROLES.EXTERNO],
    'CREATE': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR],
    'EDIT': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR],
    'UPDATE': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR],
    'DELETE': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO], // Solo admin/master/financiero borran
    'PRINT': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR, ROLES.VIEWER]
};

const checkPermission = (user, action) => {
    if (!user || !action) return false;

    // Bypass total para el Maestro
    if (user.role === ROLES.MASTER) return true;

    // Descomponemos la acción (ej: 'CREATE_USERS' -> type: 'CREATE', object: 'USERS')
    const parts = action.split('_');
    const type = parts.length > 1 ? parts[0].toUpperCase() : 'VIEW';
    const object = (parts.length > 1 ? parts.slice(1).join('') : parts[0]).toUpperCase();

    // A. VALIDACIÓN DE MÓDULO (Desde la BD)
    const moduleField = OBJECT_TO_MODULE[object];
    if (!moduleField) return false; // Si el objeto no está en un módulo, denegamos.

    const source = user.modules || user;
    const isModuleEnabled =
        source[moduleField] === true ||
        source[moduleField] === 1 ||
        source[moduleField] === "true";

    if (!isModuleEnabled) return false;

    // B. VALIDACIÓN DE ACCIÓN (Desde este fichero)
    const allowedRoles = ACTION_RULES[type];
    return allowedRoles ? allowedRoles.includes(user.role) : false;
};

module.exports = {
    ROLES,
    ROLES_LIST: Object.values(ROLES),
    checkPermission
};
