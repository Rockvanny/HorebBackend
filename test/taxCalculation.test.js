const { calculateDocumentTotals } = require('../libs/taxCalculation');
const { buildVerifactuDesglose } = require('../libs/verifactuDesglose');

const calc = (lines) => calculateDocumentTotals(lines, 'mov', 'salesinvoice');

describe('calculateDocumentTotals: impuesto + retención por línea', () => {
  test('IVA 21 % y retención 15 % sobre la misma base', () => {
    const r = calc([{ quantity: 1, unitPrice: 1000, taxType: 'IVA', vat: 21, withholdingType: 'IRPF', withholdingPercentage: 15 }]);
    expect(r.processedLines[0].amountLine).toBeCloseTo(1060);
    expect(r.headerTotals).toEqual({ amountWithoutVAT: 1000, amountVAT: 60, amountWithVAT: 1060 });
    const irpf = r.taxesToInsert.find(t => t.taxType === 'IRPF');
    expect(irpf).toMatchObject({ taxPercentage: 15, taxClass: 'RETENCION', taxableAmount: 1000, taxAmount: 150 });
    // El IVA no lleva clase: la pone DocumentTax desde el catálogo
    expect(r.taxesToInsert.find(t => t.taxType === 'IVA').taxClass).toBeUndefined();
  });

  test('Descuento: la base ya lleva el descuento; impuesto y retención sobre ella', () => {
    const r = calc([{ quantity: 2, unitPrice: 500, discount: 10, taxType: 'IVA', vat: 21, withholdingType: 'IRPF', withholdingPercentage: 15 }]);
    expect(r.processedLines[0].discount).toBe(10);
    expect(r.headerTotals.amountWithoutVAT).toBeCloseTo(900);
    expect(r.processedLines[0].amountLine).toBeCloseTo(954); // 900 + 189 - 135
    expect(r.taxesToInsert.find(t => t.taxType === 'IVA').taxableAmount).toBeCloseTo(900);
  });

  test('Descuento fuera de rango se limita a 0-100', () => {
    const r = calc([
      { quantity: 1, unitPrice: 100, discount: 150, taxType: 'IVA', vat: 21 },
      { quantity: 1, unitPrice: 100, discount: -5, taxType: 'IVA', vat: 21 }
    ]);
    expect(r.processedLines.map(l => l.discount)).toEqual([100, 0]);
    expect(r.headerTotals.amountWithoutVAT).toBeCloseTo(100);
  });

  test('Sin porcentaje o sin código no hay retención', () => {
    const r = calc([
      { quantity: 1, unitPrice: 100, taxType: 'IVA', vat: 21, withholdingType: 'IRPF', withholdingPercentage: 0 },
      { quantity: 1, unitPrice: 100, taxType: 'IVA', vat: 21, withholdingType: '', withholdingPercentage: 15 }
    ]);
    expect(r.processedLines.map(l => l.withholdingType)).toEqual([null, null]);
    expect(r.taxesToInsert).toHaveLength(1);
    expect(r.headerTotals.amountWithVAT).toBeCloseTo(242);
  });

  test('Línea antigua con IRPF como impuesto: sigue restando', () => {
    const r = calc([{ quantity: 1, unitPrice: 100, taxType: 'IRPF', vat: 15 }]);
    expect(r.headerTotals.amountWithVAT).toBeCloseTo(85);
    expect(r.taxesToInsert[0].taxClass).toBe('RETENCION');
  });

  test('Comentario: sin importes ni retención', () => {
    const r = calc([{ type: 'COMENTARIO', description: 'Nota', withholdingType: 'IRPF', withholdingPercentage: 15 }]);
    expect(r.processedLines[0]).toMatchObject({ amountLine: 0, withholdingType: null, withholdingPercentage: null });
    expect(r.taxesToInsert).toHaveLength(0);
  });

  test('Veri*factu con el desglose calculado: la retención no se declara', () => {
    const r = calc([{ quantity: 1, unitPrice: 1000, taxType: 'IVA', vat: 21, withholdingType: 'IRPF', withholdingPercentage: 15 }]);
    const d = buildVerifactuDesglose(r.taxesToInsert.map(t => ({ ...t, taxClass: t.taxClass || 'IVA' })));
    expect(d.desglose).toHaveLength(1);
    expect(d.importeTotal).toBe('1210.00');
  });

  test('Veri*factu: clase y causa guardadas en la fila mandan sobre el código', () => {
    const d = buildVerifactuDesglose([
      { taxType: 'IGIC', taxClass: 'IVA', taxPercentage: 7, taxableAmount: 100, taxAmount: 7 },
      { taxType: 'EXENTO-EXP', taxClass: 'EXENTO', exemptionCause: 'E2', taxPercentage: 0, taxableAmount: 50, taxAmount: 0 },
      { taxType: 'ReteFuente', taxClass: 'RETENCION', taxPercentage: 4, taxableAmount: 100, taxAmount: 4 }
    ]);
    expect(d.desglose.map(x => x.operacionExenta || x.calificacionOperacion)).toEqual(['S1', 'E2']);
    expect(d.importeTotal).toBe('157.00');
  });
});
