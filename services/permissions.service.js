const { MODULE_HIERARCHY, ROLE_ACTIONS, ROLE_PAGES } = require('../config/access-manager');

const buildUserPermissionsConfig = async (userData) => {
    console.log('[PERMISSIONS SERVICE] Construyendo configuración para:', userData?.id);

    // 1. Normalización de rol
    const userRole = (userData?.role || 'viewer').toLowerCase();

    // Obtenemos las configuraciones específicas del rol
    const roleActions = ROLE_ACTIONS[userRole] || { default: [] };
    const rolePages = ROLE_PAGES[userRole] || {};

    // Acciones globales (default)
    const globalActions = (roleActions.default || []).map(a => a.toUpperCase());

    // 2. Estructura base
    const permissionsConfig = {
        role: userRole,
        actions: globalActions,
        modules: {}
    };

    // 3. Iteración sobre la jerarquía
    const data = userData.dataValues || userData;

    Object.keys(MODULE_HIERARCHY).forEach(moduleKey => {
        const moduleDef = MODULE_HIERARCHY[moduleKey];
        const moduleKeyUpper = moduleKey.toUpperCase();

        // Verificamos si el usuario tiene el módulo activo
        if (data[moduleDef.field] === true || data[moduleDef.field] === 1) {

            // LÓGICA DE FILTRADO DE PÁGINAS (Punto 2 de tu requerimiento)
            // Si el rol tiene restricciones de páginas para este módulo, las usamos;
            // si no, devolvemos todas las definidas en MODULE_HIERARCHY.
            const allowedPages = rolePages[moduleKeyUpper] || moduleDef.objects;

            const moduleConfig = {
                objects: allowedPages.map(o => o.toUpperCase())
            };

            // LÓGICA DE ACCIONES ESPECÍFICAS (Punto 3 de tu requerimiento)
            // Solo añadimos 'actions' si el access-manager tiene una configuración específica
            if (roleActions.modules && roleActions.modules[moduleKeyUpper]) {
                moduleConfig.actions = roleActions.modules[moduleKeyUpper].map(a => a.toUpperCase());
            }

            permissionsConfig.modules[moduleKeyUpper] = moduleConfig;
        }
    });

    return permissionsConfig;
};

module.exports = { buildUserPermissionsConfig };
