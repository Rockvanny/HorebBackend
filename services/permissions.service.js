const { MODULE_HIERARCHY, ROLE_ACTIONS, ROLE_PAGES } = require('../config/access-manager');

const buildUserPermissionsConfig = async (userData) => {
  console.log('[PERMISSIONS SERVICE] Construyendo configuración para:', userData?.code);

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

    // COMPROBACIÓN ROBUSTA (Igual que en checkPermission)
    const val = (data.modules && data.modules[moduleDef.field]) ?? data[moduleDef.field];
    const isModuleActive = [true, 1, "true", "1"].includes(val);

    // Verificamos si el usuario tiene el módulo activo
    if (isModuleActive) {
      const allowedPages = rolePages[moduleKeyUpper] || moduleDef.objects;

      const moduleConfig = {
        objects: allowedPages
      };

      if (roleActions.modules && roleActions.modules[moduleKeyUpper]) {
        moduleConfig.actions = roleActions.modules[moduleKeyUpper].map(a => a.toUpperCase());
      }

      permissionsConfig.modules[moduleKeyUpper] = moduleConfig;
    }
  });

  console.log('DEBUG - mapResponse recibido:', JSON.stringify(permissionsConfig, null, 2));
  return permissionsConfig;
};

module.exports = { buildUserPermissionsConfig };
