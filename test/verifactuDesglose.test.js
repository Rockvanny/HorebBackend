const { buildVerifactuDesglose, VerifactuDesgloseError } = require('../libs/verifactuDesglose');

describe('buildVerifactuDesglose', () => {
  test('IVA: S1 con régimen general, tipo, base y cuota', () => {
    const r = buildVerifactuDesglose([{ taxType: 'IVA', taxPercentage: '21.00', taxableAmount: '1000', taxAmount: '210' }]);
    expect(r.desglose).toEqual([{
      impuesto: '01', claveRegimen: '01', calificacionOperacion: 'S1',
      tipoImpositivo: '21.00', baseImponibleOimporteNoSujeto: '1000.00', cuotaRepercutida: '210.00'
    }]);
    expect(r.cuotaTotal).toBe('210.00');
    expect(r.importeTotal).toBe('1210.00');
  });

  test('IRPF: no se declara y no resta de los totales', () => {
    const r = buildVerifactuDesglose([
      { taxType: 'IVA', taxPercentage: 21, taxableAmount: 1000, taxAmount: 210 },
      { taxType: 'IRPF', taxPercentage: 15, taxableAmount: 1000, taxAmount: 150 }
    ]);
    expect(r.desglose).toHaveLength(1);
    expect(r.cuotaTotal).toBe('210.00');
    expect(r.importeTotal).toBe('1210.00');
  });

  test('Exento: OperacionExenta E1, sin tipo ni cuota; suma solo la base', () => {
    const r = buildVerifactuDesglose([
      { taxType: 'IVA', taxPercentage: 10, taxableAmount: 200, taxAmount: 20 },
      { taxType: 'EXENTO', taxPercentage: 0, taxableAmount: 300, taxAmount: 0 }
    ]);
    expect(r.desglose[1]).toEqual({
      impuesto: '01', claveRegimen: '01', operacionExenta: 'E1', baseImponibleOimporteNoSujeto: '300.00'
    });
    expect(r.cuotaTotal).toBe('20.00');
    expect(r.importeTotal).toBe('520.00');
  });

  test('Rectificativa por diferencias: importes negativos', () => {
    const r = buildVerifactuDesglose([{ taxType: 'IVA', taxPercentage: 21, taxableAmount: -1615.25, taxAmount: -339.2 }]);
    expect(r.cuotaTotal).toBe('-339.20');
    expect(r.importeTotal).toBe('-1954.45');
  });

  test('Sin taxType (datos antiguos): se trata como IVA', () => {
    const r = buildVerifactuDesglose([{ taxPercentage: 21, taxBase: 100, taxAmount: 21 }]);
    expect(r.desglose[0].calificacionOperacion).toBe('S1');
    expect(r.importeTotal).toBe('121.00');
  });

  test('Recargo de equivalencia: se rechaza en vez de declararlo como IVA', () => {
    expect(() => buildVerifactuDesglose([{ taxType: 'RE', taxPercentage: 5.2, taxableAmount: 100, taxAmount: 5.2 }]))
      .toThrow(VerifactuDesgloseError);
  });

  test('Solo retenciones: no hay nada que declarar', () => {
    expect(() => buildVerifactuDesglose([{ taxType: 'IRPF', taxPercentage: 15, taxableAmount: 100, taxAmount: 15 }]))
      .toThrow(VerifactuDesgloseError);
  });
});
