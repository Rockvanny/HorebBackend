const { taxClassOf } = require('./taxClasses');

/**
 * Retención opcional de la línea (IRPF, ReteFuente...: withholdingType +
 * withholdingPercentage). Sin código o sin porcentaje, no hay retención.
 */
const lineWithholding = (line) => {
  const type = (line.withholdingType || '').trim();
  const percentage = parseFloat(line.withholdingPercentage) || 0;
  return type && percentage > 0 ? { type, percentage } : null;
};

/**
 * Procesa un array de líneas y devuelve los totales y el desglose de impuestos.
 *
 * Cada línea lleva un impuesto (taxType + vat: IVA, exento, recargo...) que
 * se suma, y una retención opcional (withholdingType +
 * withholdingPercentage) que se resta sobre la misma base:
 *   amountLine = base + impuesto - retención
 * El desglose (document_taxes) tiene una fila por código y porcentaje; las
 * de retención llevan taxClass 'RETENCION' (al resto se la pone
 * DocumentTax.fillTaxClasses desde el catálogo). Líneas antiguas con IRPF
 * como impuesto de la línea siguen restando, como antes.
 * @param {Array} lines - Líneas del documento (deben traer ancho, alto, etc.)
 * @param {String} movementId - UUID del documento padre
 * @param {String} docType - Tipo de documento (salesinvoice, salespostinvoice, etc.)
 */
const calculateDocumentTotals = (lines, movementId, docType) => {
  let totalNeto = 0;
  let totalImpuestos = 0;
  const taxGroups = {};

  const addToGroup = (taxType, percentage, taxClass, base, amount) => {
    const groupKey = `${taxType}_${percentage}`;
    if (!taxGroups[groupKey]) {
      taxGroups[groupKey] = {
        movementId: movementId,
        codeDocument: docType,
        taxType,
        taxPercentage: percentage,
        ...(taxClass ? { taxClass } : {}),
        taxableAmount: 0,
        taxAmount: 0
      };
    }
    taxGroups[groupKey].taxableAmount += base;
    taxGroups[groupKey].taxAmount += amount;
  };

  const processedLines = lines.map((line, index) => {
    // Línea COMENTARIO: solo texto libre en 'description', no suma a
    // totales ni genera desglose de impuestos (ver
    // db/models/salesBudgetLines.model.js#type). Todo lo demás se normaliza
    // a su valor neutro, sin ejecutar la lógica de cálculo por unidad de
    // medida (que no aplica aquí).
    if ((line.type || 'PRODUCTO') === 'COMENTARIO') {
      return {
        ...line,
        lineNo: line.lineNo || (index + 1),
        type: 'COMENTARIO',
        codeItem: null,
        quantity: 0,
        unitPrice: 0,
        quantityUnitMeasure: 1,
        width: 0,
        height: 0,
        vat: 0,
        taxType: line.taxType || 'IVA',
        withholdingType: null,
        withholdingPercentage: null,
        amountLine: 0
      };
    }

    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unitPrice) || 0;
    const factor = parseFloat(line.quantityUnitMeasure) || 1;
    const vatPerc = parseFloat(line.vat) || 0;
    const type = line.taxType || 'IVA';

    // Nuevos campos para metros cuadrados
    const width = parseFloat(line.width) || 0;
    const height = parseFloat(line.height) || 0;

    // Normalizar la unidad de medida
    const unitMeasure = (line.unitMeasure || '').toUpperCase().trim();
    let lineNeto = 0;

    // Lógica de cálculo según la Unidad de Medida
    switch (unitMeasure) {
      case 'METRO2':
        // Si es METRO2, multiplica cantidad x precio x ancho x alto (o usa width * height como área)
        // Asegúrate de que si ancho/alto vienen vacíos o en 0, no anulen el cálculo (puedes usar 1 por defecto si procede)
        const effectiveWidth = width > 0 ? width : 1;
        const effectiveHeight = height > 0 ? height : 1;
        lineNeto = qty * price * effectiveWidth * effectiveHeight;
        break;

      case 'METRO':
      case 'ML': // Metros lineales (cantidad x precio x factor)
        lineNeto = qty * price * factor;
        break;

      case 'UNIDAD':
      case 'HORA':
      case 'DIA':
      case 'SERVICIO':
      case 'KILOGRAMO':
      case 'LITRO':
      case 'PACK':
      default:
        // Unidades estándar
        lineNeto = qty * price;
        break;
    }

    // Cálculo de la cuota: El IRPF resta, el IVA suma
    const isRetencion = taxClassOf(type) === 'RETENCION';
    const lineTaxAmount = lineNeto * (vatPerc / 100);

    totalNeto += lineNeto;

    let lineFinalAmount = lineNeto;
    if (isRetencion) {
      totalImpuestos -= lineTaxAmount;
      lineFinalAmount -= lineTaxAmount;
    } else {
      totalImpuestos += lineTaxAmount;
      lineFinalAmount += lineTaxAmount;
    }

    // Agrupación para el desglose de impuestos
    addToGroup(type, vatPerc, isRetencion ? 'RETENCION' : null, lineNeto, lineTaxAmount);

    // Retención opcional sobre la misma base
    const withholding = lineWithholding(line);
    if (withholding) {
      const withholdingAmount = lineNeto * (withholding.percentage / 100);
      totalImpuestos -= withholdingAmount;
      lineFinalAmount -= withholdingAmount;
      addToGroup(withholding.type, withholding.percentage, 'RETENCION', lineNeto, withholdingAmount);
    }

    return {
      ...line,
      lineNo: line.lineNo || (index + 1),
      amountLine: lineFinalAmount,
      taxType: type,
      withholdingType: withholding?.type || null,
      withholdingPercentage: withholding?.percentage ?? null,
      // quantityUnitMeasure es NOT NULL en BD (factor 1 por defecto): el
      // front manda null cuando la unidad no es METRO (ver
      // transactionLinesHandler.js#getLinesData), así que se normaliza aquí
      // al mismo valor ya usado para el cálculo, en vez de dejar pasar el
      // null crudo hacia el INSERT.
      quantityUnitMeasure: factor,
      // width/height sí admiten NULL en BD, pero al no ser METRO2 tampoco
      // tienen valor real: se guardan en 0 para que el histórico sea
      // consistente en vez de mezclar null y 0 según la unidad.
      width: unitMeasure === 'METRO2' ? width : 0,
      height: unitMeasure === 'METRO2' ? height : 0
    };
  });

  return {
    processedLines,
    taxesToInsert: Object.values(taxGroups),
    headerTotals: {
      amountWithoutVAT: totalNeto,
      amountVAT: totalImpuestos,
      amountWithVAT: totalNeto + totalImpuestos
    }
  };
};

module.exports = { calculateDocumentTotals };
