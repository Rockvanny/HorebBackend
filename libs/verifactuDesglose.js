/**
 * Desglose de impuestos de un registro de alta Veri*factu (DetalleDesglose,
 * ver resources/verifactu-xsd/SuministroInformacion.xsd#DetalleType) y sus
 * totales, a partir del desglose de la factura (document_taxes: una fila
 * por tipo de impuesto y porcentaje).
 *
 * Antes cada fila se enviaba como IVA sujeto (Impuesto 01, S1), también las
 * retenciones y las exentas, y CuotaTotal / ImporteTotal salían con el IRPF
 * ya restado. Ahora, según la clase fiscal del impuesto:
 *  - IVA (lo que se suma): Impuesto 01, ClaveRegimen 01 (régimen general),
 *    CalificacionOperacion S1, tipo, base y cuota.
 *  - EXENTO: Impuesto 01, ClaveRegimen 01, OperacionExenta (E1 por defecto:
 *    art. 20 LIVA), solo base.
 *  - RETENCION (IRPF): no se declara en el desglose ni en los totales; la
 *    retención no forma parte del registro de facturación.
 *  - RECARGO de equivalencia: se declara junto al IVA de la misma base
 *    (TipoRecargoEquivalencia), y con un impuesto por línea eso no se puede
 *    construir: se rechaza en vez de declararlo mal.
 *
 * CuotaTotal = suma de cuotas declaradas; ImporteTotal = suma de bases +
 * cuotas declaradas.
 */

// Clase fiscal según el código del impuesto de la línea. Cuando los
// impuestos sean un catálogo editable, la clase vendrá del catálogo.
const TAX_CLASS_BY_CODE = {
  IVA: 'IVA',
  IRPF: 'RETENCION',
  EXENTO: 'EXENTO',
  RE: 'RECARGO'
};

const taxClassOf = (taxType) => TAX_CLASS_BY_CODE[String(taxType || 'IVA').toUpperCase()] || 'IVA';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fixed2 = (n) => round2(n).toFixed(2);

class VerifactuDesgloseError extends Error { }

/**
 * @param {Array<{taxType?: string, taxPercentage: number|string, taxableAmount?: number|string,
 *   taxBase?: number|string, taxAmount: number|string}>} taxLines
 * @param {{ exemptionCause?: string }} [options]
 * @returns {{ desglose: object[], cuotaTotal: string, importeTotal: string }}
 */
const buildVerifactuDesglose = (taxLines, { exemptionCause = 'E1' } = {}) => {
  const desglose = [];
  let cuotas = 0;
  let bases = 0;

  for (const tax of taxLines || []) {
    const taxClass = taxClassOf(tax.taxType);
    const base = round2(tax.taxableAmount ?? tax.taxBase ?? 0);
    const cuota = round2(tax.taxAmount);

    if (taxClass === 'RETENCION') continue;

    if (taxClass === 'RECARGO') {
      throw new VerifactuDesgloseError(
        'Esta factura lleva recargo de equivalencia, que aún no se puede declarar en Veri*factu '
        + '(debe ir junto al IVA de la misma línea). Quita el recargo o emite la factura fuera de Veri*factu.'
      );
    }

    if (taxClass === 'EXENTO') {
      desglose.push({
        impuesto: '01',
        claveRegimen: '01',
        operacionExenta: exemptionCause,
        baseImponibleOimporteNoSujeto: fixed2(base)
      });
      bases += base;
      continue;
    }

    desglose.push({
      impuesto: '01',
      claveRegimen: '01',
      calificacionOperacion: 'S1',
      tipoImpositivo: fixed2(tax.taxPercentage),
      baseImponibleOimporteNoSujeto: fixed2(base),
      cuotaRepercutida: fixed2(cuota)
    });
    bases += base;
    cuotas += cuota;
  }

  if (!desglose.length) {
    throw new VerifactuDesgloseError(
      'La factura no tiene ningún impuesto que declarar en Veri*factu (solo retenciones o ninguna línea con importe).'
    );
  }

  return {
    desglose,
    cuotaTotal: fixed2(cuotas),
    importeTotal: fixed2(bases + cuotas)
  };
};

module.exports = { buildVerifactuDesglose, taxClassOf, VerifactuDesgloseError };
