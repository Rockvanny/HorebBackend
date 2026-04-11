// backend/config/access-control.js

const ROLES = {
    MASTER: 'master',
    ADMIN: 'admin',
    FINANCIERO: 'financiero',
    VENDEDOR: 'vendedor',
    EXTERNO: 'externo',
    VIEWER: 'viewer'
};

const CONTEXT_TO_BD_MODULE = {
    'MASTERS': 'gestion', 'CUSTOMERS': 'gestion', 'VENDORS': 'gestion', 'PRODUCTS': 'gestion', 'STATS': 'gestion',
    'SALES': 'sales', 'SALESBUDGETS': 'sales', 'SALESINVOICES': 'sales', 'SALESPOSTINVOICES': 'sales', 'SALESDUEDATEINVOICE': 'sales',
    'PURCHASES': 'purchases', 'PURCHINVOICES': 'purchases', 'PURCHPOSTINVOICES': 'purchases', 'PURCHDUEDATEINVOICE': 'purchases',
    'ADMIN': 'master', 'USERS': 'master', 'SETTINGS': 'master', 'ACCESS': 'master'
};

const ACTION_RULES = {
    'VIEW': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR, ROLES.VIEWER, ROLES.EXTERNO],
    'CREATE': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR],
    'EDIT': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR],
    'UPDATE': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR],
    'DELETE': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO],
    'PRINT': [ROLES.MASTER, ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR, ROLES.VIEWER]
};

/**
 * Esta función es la que usará el router y los servicios del backend
 */
const checkPermission = (user, action) => {
    if (!user || !action) return false;
    if (user.role === ROLES.MASTER) return true;

    const parts = action.split('_');
    const type = parts.length > 1 ? parts[0].toUpperCase() : 'VIEW';
    const context = (parts.length > 1 ? parts.slice(1).join('') : parts[0]).toUpperCase();

    const bdModuleKey = CONTEXT_TO_BD_MODULE[context] || context.toLowerCase();

    const isModuleEnabled = user.modules && (
        user.modules[bdModuleKey] === true ||
        user.modules[bdModuleKey] === 1 ||
        user.modules[bdModuleKey] === "true"
    );

    if (!isModuleEnabled) return false;

    const allowedRoles = ACTION_RULES[type];
    return allowedRoles ? allowedRoles.includes(user.role) : false;
};

module.exports = {
    ROLES,
    ROLES_LIST: Object.values(ROLES),
    checkPermission
};
