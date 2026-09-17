// Mockeamos ModuleConfigService ANTES de requerir permissions.service.js,
// porque este último lo instancia una sola vez al cargar el módulo
// (`const moduleConfigService = new ModuleConfigService();`) y su
// isEnabled() golpea la base de datos -aquí no hay BD real, así que se
// controla la respuesta desde cada test con mockIsEnabled.
const mockIsEnabled = jest.fn();
jest.mock('../services/moduleConfig.service', () => {
  return jest.fn().mockImplementation(() => ({
    isEnabled: mockIsEnabled
  }));
});

const { buildUserPermissionsConfig } = require('../services/permissions.service');

// El servicio deja varios console.log de depuración (payload completo por
// cada llamada) que no aportan nada a la salida de los tests.
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterAll(() => {
  console.log.mockRestore();
});

function makeUserData(role, overrides = {}) {
  return {
    role,
    allowGestion: true,
    allowSales: true,
    allowPurchases: true,
    allowSettings: true,
    allowReports: true,
    ...overrides
  };
}

describe('buildUserPermissionsConfig', () => {
  beforeEach(() => {
    mockIsEnabled.mockReset();
    mockIsEnabled.mockResolvedValue(true); // VeriFactu activo por defecto
  });

  test('sin ningún módulo activo, no expone ningún módulo', async () => {
    const user = makeUserData('admin', {
      allowGestion: false, allowSales: false, allowPurchases: false,
      allowSettings: false, allowReports: false
    });

    const config = await buildUserPermissionsConfig(user);

    expect(Object.keys(config.modules)).toHaveLength(0);
  });

  test('admin con todo activo ve los 5 módulos, con VeriFactu incluido', async () => {
    const user = makeUserData('admin');

    const config = await buildUserPermissionsConfig(user);

    expect(Object.keys(config.modules).sort()).toEqual(
      ['GESTION', 'PURCHASES', 'REPORTS', 'SALES', 'SETUP'].sort()
    );
    expect(config.modules.SALES.objects).toContain('verifactuLogs');
    expect(config.modules.SETUP.objects).toContain('verifactuConfig');
    expect(config.role).toBe('admin');
    expect(config.actions).toEqual(
      expect.arrayContaining(['VIEW', 'CREATE', 'EDIT', 'UPDATE', 'DELETE', 'PRINT'])
    );
  });

  test('con el módulo VeriFactu desactivado, se ocultan sus objetos aunque el usuario tenga acceso a SALES/SETUP', async () => {
    mockIsEnabled.mockResolvedValue(false);
    const user = makeUserData('admin');

    const config = await buildUserPermissionsConfig(user);

    expect(config.modules.SALES.objects).not.toContain('verifactuLogs');
    expect(config.modules.SETUP.objects).not.toContain('verifactuConfig');
    // El resto de objetos de esos módulos se mantiene intacto
    expect(config.modules.SALES.objects).toContain('salesInvoices');
    expect(config.modules.SETUP.objects).toContain('company');
  });

  test('financiero solo ve company/series en SETUP (ROLE_PAGES), no el listado completo', async () => {
    const user = makeUserData('financiero');

    const config = await buildUserPermissionsConfig(user);

    expect(config.modules.SETUP.objects.sort()).toEqual(['company', 'series'].sort());
    // Fuera de SETUP no hay restricción de página
    expect(config.modules.GESTION.objects).toEqual(
      expect.arrayContaining(['customers', 'vendors', 'products', 'operatingExpenses'])
    );
  });

  test('externo solo tiene VIEW en sus acciones globales', async () => {
    const user = makeUserData('externo');

    const config = await buildUserPermissionsConfig(user);

    expect(config.actions).toEqual(['VIEW']);
  });

  test('si falla la comprobación de VeriFactu, se asume activo (no debe romper el login)', async () => {
    mockIsEnabled.mockRejectedValue(new Error('DB caída'));
    const user = makeUserData('admin');

    const config = await buildUserPermissionsConfig(user);

    expect(config.modules.SALES.objects).toContain('verifactuLogs');
  });

  test('soporta el usuario en forma de instancia Sequelize (user.dataValues)', async () => {
    const user = { dataValues: makeUserData('vendedor') };

    const config = await buildUserPermissionsConfig(user);

    expect(config.modules.SALES).toBeDefined();
    expect(config.modules.SALES.objects).toContain('salesInvoices');
  });

  test('acepta el flag de módulo en formato string "1"/"true" (no solo boolean)', async () => {
    const user = makeUserData('admin', { allowReports: '1', allowGestion: 'true' });

    const config = await buildUserPermissionsConfig(user);

    expect(config.modules.REPORTS).toBeDefined();
    expect(config.modules.GESTION).toBeDefined();
  });
});
