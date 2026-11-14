// Módulos compartidos que sustituyen a copias repetidas en los servicios
// (ver libs/pagination.js y libs/invoiceTypes.js).
const { parsePagination, pageResult, MAX_LIMIT } = require('../libs/pagination');
const { INVOICED_TYPES, CREDIT_NOTE_TYPES, isCreditNote } = require('../libs/invoiceTypes');

describe('libs/pagination', () => {
  test('valores por defecto si no llegan o no son números', () => {
    expect(parsePagination(undefined, undefined)).toEqual({ limit: 100, offset: 0 });
    expect(parsePagination('abc', '-5')).toEqual({ limit: 100, offset: 0 });
    expect(parsePagination(undefined, undefined, 20)).toEqual({ limit: 20, offset: 0 });
  });

  test('acepta strings de la query', () => {
    expect(parsePagination('50', '100')).toEqual({ limit: 50, offset: 100 });
  });

  test('limita el tamaño de página (protege la memoria del servidor)', () => {
    expect(parsePagination('100000', '0').limit).toBe(MAX_LIMIT);
    expect(parsePagination(0, 0).limit).toBe(100);
  });

  test('pageResult calcula si hay más páginas', () => {
    expect(pageResult([1, 2], 5, 0)).toEqual({ records: [1, 2], hasMore: true, total: 5 });
    expect(pageResult([1, 2], 5, 3)).toEqual({ records: [1, 2], hasMore: false, total: 5 });
  });
});

describe('libs/invoiceTypes', () => {
  test('facturas y abonos oficiales', () => {
    expect(INVOICED_TYPES).toEqual(['F1', 'F2']);
    expect(CREDIT_NOTE_TYPES).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
  });

  test('isCreditNote', () => {
    expect(isCreditNote('R4')).toBe(true);
    expect(isCreditNote('F1')).toBe(false);
  });

  test('las listas no se pueden modificar por error', () => {
    expect(Object.isFrozen(CREDIT_NOTE_TYPES)).toBe(true);
  });
});
