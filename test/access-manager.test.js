const { checkPermission, ROLES, MODULE_HIERARCHY, ACTIONS } = require('../config/access-manager');

/**
 * Construye un usuario de prueba con todos los módulos activos por defecto,
 * para poder aislar en cada test si lo que falla es el rol/página o el
 * propio flag de módulo. `overrides` permite desactivar módulos concretos
 * (ej. { allowSales: false }) o sustituir el objeto entero por la variante
 * anidada `modules: {...}` que también soporta checkPermission.
 */
function makeUser(role, overrides = {}) {
  return {
    id: 1,
    role,
    allowGestion: true,
    allowSales: true,
    allowPurchases: true,
    allowSettings: true,
    allowReports: true,
    ...overrides
  };
}

describe('checkPermission - guardas básicas', () => {
  test('sin usuario, deniega', () => {
    expect(checkPermission(null, 'VIEW_CUSTOMERS')).toBe(false);
    expect(checkPermission(undefined, 'VIEW_CUSTOMERS')).toBe(false);
  });

  test('sin actionString, deniega', () => {
    const user = makeUser(ROLES.ADMIN);
    expect(checkPermission(user, null)).toBe(false);
    expect(checkPermission(user, undefined)).toBe(false);
    expect(checkPermission(user, '')).toBe(false);
  });

  test('objeto desconocido (no registrado en MODULE_HIERARCHY), deniega para cualquier rol', () => {
    const admin = makeUser(ROLES.ADMIN);
    expect(checkPermission(admin, 'VIEW_OBJETOINEXISTENTE')).toBe(false);
  });

  test('rol desconocido, deniega aunque el módulo esté activo', () => {
    const user = makeUser('rol-que-no-existe');
    expect(checkPermission(user, 'VIEW_CUSTOMERS')).toBe(false);
  });
});

describe('checkPermission - el flag de módulo manda sobre el rol (incluso admin)', () => {
  test('admin sin allowSales activo no puede ver facturas de venta', () => {
    const admin = makeUser(ROLES.ADMIN, { allowSales: false });
    expect(checkPermission(admin, 'VIEW_SALESINVOICES')).toBe(false);
  });

  test('admin sin allowGestion activo no puede ver clientes', () => {
    const admin = makeUser(ROLES.ADMIN, { allowGestion: false });
    expect(checkPermission(admin, 'VIEW_CUSTOMERS')).toBe(false);
  });

  test('con el módulo reactivado, admin recupera el acceso', () => {
    const admin = makeUser(ROLES.ADMIN, { allowSales: true });
    expect(checkPermission(admin, 'VIEW_SALESINVOICES')).toBe(true);
  });

  test('acepta el flag en formato anidado user.modules.<campo>', () => {
    const admin = { role: ROLES.ADMIN, modules: { allowGestion: true, allowSales: false } };
    expect(checkPermission(admin, 'VIEW_CUSTOMERS')).toBe(true);
    expect(checkPermission(admin, 'VIEW_SALESINVOICES')).toBe(false);
  });

  test.each([
    [true, true],
    [1, true],
    ['true', true],
    ['1', true],
    [false, false],
    [0, false],
    ['false', false],
    [undefined, false],
    [null, false]
  ])('allowGestion=%p -> permitido=%p', (value, expected) => {
    const admin = makeUser(ROLES.ADMIN, { allowGestion: value });
    expect(checkPermission(admin, 'VIEW_CUSTOMERS')).toBe(expected);
  });

  test('soporta instancias Sequelize (user.dataValues)', () => {
    const admin = { dataValues: makeUser(ROLES.ADMIN) };
    expect(checkPermission(admin, 'VIEW_CUSTOMERS')).toBe(true);
  });
});

describe('checkPermission - matriz de acciones por rol (objeto sin restricción de página)', () => {
  // 'customers' vive en GESTION, y ningún rol tiene ROLE_PAGES definido para
  // GESTION, así que aquí se prueba en estado puro el ROLE_ACTIONS de cada
  // rol, sin que la restricción de página (financiero/SETUP) interfiera.
  const ALL_ACTIONS = Object.values(ACTIONS).map(a => a.toUpperCase());

  test.each([
    [ROLES.ADMIN, ['VIEW', 'CREATE', 'EDIT', 'UPDATE', 'DELETE', 'PRINT']],
    [ROLES.FINANCIERO, ['VIEW', 'CREATE', 'EDIT', 'UPDATE', 'DELETE', 'PRINT']],
    [ROLES.VENDEDOR, ['VIEW', 'CREATE', 'EDIT', 'UPDATE', 'PRINT']],
    [ROLES.VIEWER, ['VIEW', 'PRINT']],
    [ROLES.EXTERNO, ['VIEW']],
    [ROLES.SYSTEM, ['VIEW', 'CREATE', 'EDIT', 'UPDATE', 'DELETE']]
  ])('%s puede: %p (y nada más)', (role, allowed) => {
    const user = makeUser(role);
    const denied = ALL_ACTIONS.filter(a => !allowed.includes(a));

    allowed.forEach(action => {
      expect(checkPermission(user, `${action}_CUSTOMERS`)).toBe(true);
    });
    denied.forEach(action => {
      expect(checkPermission(user, `${action}_CUSTOMERS`)).toBe(false);
    });
  });

  test('vendedor nunca puede eliminar, en ningún módulo activo', () => {
    const vendedor = makeUser(ROLES.VENDEDOR);
    expect(checkPermission(vendedor, 'DELETE_SALESINVOICES')).toBe(false);
    expect(checkPermission(vendedor, 'DELETE_PURCHINVOICES')).toBe(false);
    expect(checkPermission(vendedor, 'DELETE_CUSTOMERS')).toBe(false);
  });

  test('externo solo puede ver, nunca imprimir ni escribir', () => {
    const externo = makeUser(ROLES.EXTERNO);
    expect(checkPermission(externo, 'VIEW_SALESINVOICES')).toBe(true);
    expect(checkPermission(externo, 'PRINT_SALESINVOICES')).toBe(false);
    expect(checkPermission(externo, 'CREATE_SALESINVOICES')).toBe(false);
    expect(checkPermission(externo, 'UPDATE_SALESINVOICES')).toBe(false);
    expect(checkPermission(externo, 'DELETE_SALESINVOICES')).toBe(false);
  });

  test('system no puede imprimir (no está en su ROLE_ACTIONS)', () => {
    const system = makeUser(ROLES.SYSTEM);
    expect(checkPermission(system, 'PRINT_SALESINVOICES')).toBe(false);
    expect(checkPermission(system, 'DELETE_SALESINVOICES')).toBe(true);
  });
});

describe('checkPermission - ROLE_PAGES (financiero solo ve company/series dentro de SETUP)', () => {
  test('financiero SÍ ve company y series', () => {
    const financiero = makeUser(ROLES.FINANCIERO);
    expect(checkPermission(financiero, 'VIEW_COMPANY')).toBe(true);
    expect(checkPermission(financiero, 'VIEW_SERIES')).toBe(true);
    expect(checkPermission(financiero, 'UPDATE_COMPANY')).toBe(true);
  });

  test('financiero NO ve el resto de páginas de SETUP, aunque la acción esté permitida por su rol', () => {
    const financiero = makeUser(ROLES.FINANCIERO);
    expect(checkPermission(financiero, 'VIEW_USERS')).toBe(false);
    expect(checkPermission(financiero, 'VIEW_MODULECONFIG')).toBe(false);
    expect(checkPermission(financiero, 'VIEW_VERIFACTUCONFIG')).toBe(false);
    expect(checkPermission(financiero, 'VIEW_CONEXION')).toBe(false);
  });

  test('financiero SÍ tiene acceso completo fuera de SETUP (la restricción es solo de ese módulo)', () => {
    const financiero = makeUser(ROLES.FINANCIERO);
    expect(checkPermission(financiero, 'VIEW_CUSTOMERS')).toBe(true);
    expect(checkPermission(financiero, 'DELETE_SALESINVOICES')).toBe(true);
    expect(checkPermission(financiero, 'VIEW_PURCHINVOICES')).toBe(true);
  });

  test('otros roles no tienen restricción de página en SETUP (ROLE_PAGES no los define)', () => {
    const admin = makeUser(ROLES.ADMIN);
    const vendedor = makeUser(ROLES.VENDEDOR);
    expect(checkPermission(admin, 'VIEW_USERS')).toBe(true);
    // vendedor sí ve 'users' en cuanto a página, aunque en la práctica su
    // ROLE_ACTIONS no incluye DELETE; aquí se prueba solo la visibilidad.
    expect(checkPermission(vendedor, 'VIEW_USERS')).toBe(true);
  });
});

describe('checkPermission - insensibilidad a mayúsculas/minúsculas', () => {
  test('el actionString funciona en minúsculas, mayúsculas o mixto', () => {
    const admin = makeUser(ROLES.ADMIN);
    expect(checkPermission(admin, 'view_customers')).toBe(true);
    expect(checkPermission(admin, 'View_Customers')).toBe(true);
    expect(checkPermission(admin, 'VIEW_CUSTOMERS')).toBe(true);
  });

  test('objetos camelCase en MODULE_HIERARCHY casan con el actionString en mayúsculas', () => {
    const admin = makeUser(ROLES.ADMIN);
    expect(checkPermission(admin, 'VIEW_SALESPOSTINVOICES')).toBe(true);
    expect(checkPermission(admin, 'VIEW_SALESOVERDUEINVOICES')).toBe(true);
    expect(checkPermission(admin, 'VIEW_PURCHOVERDUEINVOICES')).toBe(true);
  });
});

describe('checkPermission - un solo token sin "TIPO_" se interpreta como VIEW', () => {
  test('un actionString sin guion bajo asume VIEW sobre ese objeto', () => {
    const admin = makeUser(ROLES.ADMIN);
    const externo = makeUser(ROLES.EXTERNO);
    expect(checkPermission(admin, 'CUSTOMERS')).toBe(true);
    expect(checkPermission(externo, 'CUSTOMERS')).toBe(true); // externo sí puede VIEW
  });
});

describe('checkPermission - objetos añadidos para abonos/rectificativas (salesCreditNotes/purchCreditNotes)', () => {
  test('están registrados en el módulo correcto', () => {
    expect(MODULE_HIERARCHY.SALES.objects).toContain('salesCreditNotes');
    expect(MODULE_HIERARCHY.PURCHASES.objects).toContain('purchCreditNotes');
  });

  test('se comportan como cualquier otro objeto de su módulo', () => {
    const vendedor = makeUser(ROLES.VENDEDOR);
    expect(checkPermission(vendedor, 'VIEW_SALESCREDITNOTES')).toBe(true);
    expect(checkPermission(vendedor, 'DELETE_SALESCREDITNOTES')).toBe(false);

    const vendedorSinVenta = makeUser(ROLES.VENDEDOR, { allowSales: false });
    expect(checkPermission(vendedorSinVenta, 'VIEW_SALESCREDITNOTES')).toBe(false);
  });
});

describe('checkPermission - cada módulo usa su propio flag de activación', () => {
  test.each([
    ['GESTION', 'allowGestion', 'VIEW_CUSTOMERS'],
    ['SALES', 'allowSales', 'VIEW_SALESINVOICES'],
    ['PURCHASES', 'allowPurchases', 'VIEW_PURCHINVOICES'],
    ['SETUP', 'allowSettings', 'VIEW_COMPANY'],
    ['REPORTS', 'allowReports', 'VIEW_STATS']
  ])('módulo %s depende únicamente de %s', (_moduleKey, field, action) => {
    const admin = makeUser(ROLES.ADMIN, { [field]: false });
    expect(checkPermission(admin, action)).toBe(false);

    const admin2 = makeUser(ROLES.ADMIN, { [field]: true });
    expect(checkPermission(admin2, action)).toBe(true);
  });
});
