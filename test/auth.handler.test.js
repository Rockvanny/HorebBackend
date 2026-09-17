const { checkAction, checkRole } = require('../middlewares/auth.handler');

function makeRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

// checkAction deja un console.warn ("[SECURITY ALERT]...") en cada denegación
// -es la conducta real y correcta, pero no aporta nada a la salida de tests.
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  console.warn.mockRestore();
});

describe('checkAction - middleware que envuelve checkPermission', () => {
  test('sin req.user, corta con 401 (unauthorized) y no sigue', async () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    await checkAction('VIEW_CUSTOMERS')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.output.statusCode).toBe(401);
  });

  test('usuario con permiso -> next() sin error', async () => {
    const req = { user: { role: 'admin', allowGestion: true } };
    const res = makeRes();
    const next = jest.fn();

    await checkAction('VIEW_CUSTOMERS')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // sin argumentos = continúa la cadena
  });

  test('usuario sin permiso -> next(403 forbidden), nunca continúa la cadena', async () => {
    const req = { user: { role: 'externo', allowGestion: true } };
    const res = makeRes();
    const next = jest.fn();

    await checkAction('DELETE_CUSTOMERS')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.output.statusCode).toBe(403);
  });

  test('módulo desactivado deniega incluso a un admin', async () => {
    const req = { user: { role: 'admin', allowSales: false } };
    const res = makeRes();
    const next = jest.fn();

    await checkAction('VIEW_SALESINVOICES')(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.output.statusCode).toBe(403);
  });
});

describe('checkRole - middleware de validación de rol', () => {
  test('rol permitido -> next() sin error', () => {
    const req = { user: { role: 'admin' } };
    const res = makeRes();
    const next = jest.fn();

    checkRole('admin', 'financiero')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  test('rol no permitido -> next(403 forbidden)', () => {
    const req = { user: { role: 'externo' } };
    const res = makeRes();
    const next = jest.fn();

    checkRole('admin', 'financiero')(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.output.statusCode).toBe(403);
  });

  test('sin usuario -> next(403 forbidden)', () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    checkRole('admin')(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.output.statusCode).toBe(403);
  });

  test('comparación de rol insensible a mayúsculas', () => {
    const req = { user: { role: 'ADMIN' } };
    const res = makeRes();
    const next = jest.fn();

    checkRole('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
