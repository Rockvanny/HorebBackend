const { nitCheckDigit } = require('../libs/colombia');
const { createCustomerSchema, registerCustomerAccountSchema } = require('../schemas/customer.schema');
const { createVendorSchema } = require('../schemas/vendor.schema');

const base = { selectedSerie: 'CL', name: 'Cliente', email: 'a@b.co', phone: '3001234567', address: 'Cra 7 # 72-41', city: 'Bogotá' };

describe('Colombia: dígito de verificación del NIT', () => {
  test('NIT de la DIAN (800197268-4)', () => expect(nitCheckDigit('800197268')).toBe(4));
  test('Ignora puntos y guiones', () => expect(nitCheckDigit('800.197.268')).toBe(4));
  test('Vacío o demasiado largo: null', () => {
    expect(nitCheckDigit('')).toBeNull();
    expect(nitCheckDigit('1234567890123456')).toBeNull();
  });
});

describe('Colombia: validación de fichas sin tocar España', () => {
  test('España: sigue exigiendo NIF y código postal', () => {
    expect(createCustomerSchema.validate({ ...base, postCode: '28001' }).error).toBeTruthy();
    expect(createCustomerSchema.validate({ ...base, nif: 'B12345678' }).error).toBeTruthy();
    expect(createCustomerSchema.validate({ ...base, nif: 'B12345678', postCode: '28001' }).error).toBeUndefined();
  });

  test('Colombia: con documento colombiano NIF y CP no son obligatorios (vacíos)', () => {
    const r = createVendorSchema.validate({ ...base, category: 'Suministros de Obra', coIdType: 'CC', coIdNumber: '52123456' });
    expect(r.error).toBeUndefined();
    expect(r.value).toMatchObject({ nif: '', postCode: '' });
  });

  test('Colombia: el DV del NIT tiene que cuadrar', () => {
    const ok = { ...base, coIdType: 'NIT', coIdNumber: '800197268', coCheckDigit: '4' };
    expect(createCustomerSchema.validate(ok).error).toBeUndefined();
    expect(createCustomerSchema.validate({ ...ok, coCheckDigit: '5' }).error.message).toMatch(/es 4/);
  });

  test('Registro de la app móvil: sigue exigiendo NIF', () => {
    expect(registerCustomerAccountSchema.validate({ email: 'a@b.co', password: '12345678' }).error).toBeTruthy();
  });
});
