const { MODULE_HIERARCHY, ROLE_ACTIONS, ROLE_PAGES } = require('../config/access-manager');
const ModuleConfigService = require('./moduleConfig.service');
const logger = require('../libs/logger');

const moduleConfigService = new ModuleConfigService();

// Objetos del sidebar que solo tienen sentido si el módulo de negocio
// Veri*factu (module_config, key 'VERIFACTU') está activo: si está
// desactivado, se ocultan del menú aunque el usuario tenga permiso de rol/
// módulo para verlos -no tiene sentido enseñar la configuración o el
// registro de una funcionalidad apagada-.
const VERIFACTU_GATED_OBJECTS = ['verifactuConfig', 'verifactuLogs'];

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

  // Se pide una sola vez para todos los módulos (no por cada objeto). Si la
  // consulta falla (BD caída justo en el login), se asume activo -no debe
  // romper el login ni esconder el menú por un fallo transitorio de BD-.
  let verifactuEnabled = true;
  try {
    verifactuEnabled = await moduleConfigService.isEnabled('VERIFACTU');
  } catch (error) {
    logger.error(`permissions.service: no se pudo comprobar el módulo VERIFACTU, se asume activo: ${error.message}`);
  }

  Object.keys(MODULE_HIERARCHY).forEach(moduleKey => {
    const moduleDef = MODULE_HIERARCHY[moduleKey];
    const moduleKeyUpper = moduleKey.toUpperCase();

    // COMPROBACIÓN ROBUSTA (Igual que en checkPermission)
    const val = (data.modules && data.modules[moduleDef.field]) ?? data[moduleDef.field];
    const isModuleActive = [true, 1, "true", "1"].includes(val);

    // Verificamos si el usuario tiene el módulo activo
    if (isModuleActive) {
      let allowedPages = rolePages[moduleKeyUpper] || moduleDef.objects;
      if (!verifactuEnabled) {
        allowedPages = allowedPages.filter(obj => !VERIFACTU_GATED_OBJECTS.includes(obj));
      }

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
