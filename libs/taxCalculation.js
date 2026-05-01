/**
 * Procesa un array de líneas y devuelve los totales y el desglose de impuestos
 * @param {Array} lines - Líneas del documento (deben traer taxType)
 * @param {String} movementId - UUID del documento padre
 * @param {String} docType - Tipo de documento (salesinvoice, salespostinvoice, etc.)
 */
const calculateDocumentTotals = (lines, movementId, docType) => {
  let totalNeto = 0;
  let totalImpuestos = 0;
  const taxGroups = {};

  const processedLines = lines.map((line, index) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unitPrice) || 0;
    const factor = parseFloat(line.quantityUnitMeasure) || 1;
    const vatPerc = parseFloat(line.vat) || 0;
    const type = line.taxType || 'IVA';

    // Base imponible de la línea
    const lineNeto = qty * factor * price;

    // Cálculo de la cuota: El IRPF resta, el IVA suma
    const isRetencion = type === 'IRPF';
    const lineTaxAmount = lineNeto * (vatPerc / 100);

    totalNeto += lineNeto;

    // Ajuste de la línea para incluir el impuesto en amountLine
    let lineFinalAmount = lineNeto;
    if (isRetencion) {
      totalImpuestos -= lineTaxAmount;
      lineFinalAmount -= lineTaxAmount; // Resta el IRPF del total de línea
    } else {
      totalImpuestos += lineTaxAmount;
      lineFinalAmount += lineTaxAmount; // Suma el IVA al total de línea
    }

    // Agrupación para el desglose de impuestos
    const groupKey = `${type}_${vatPerc}`;

    if (!taxGroups[groupKey]) {
      taxGroups[groupKey] = {
        movementId: movementId,
        codeDocument: docType,
        taxType: type,
        taxPercentage: vatPerc,
        taxableAmount: 0,
        taxAmount: 0
      };
    }

    taxGroups[groupKey].taxableAmount += lineNeto;
    taxGroups[groupKey].taxAmount += lineTaxAmount;

    return {
      ...line,
      lineNo: line.lineNo || (index + 1),
      amountLine: lineFinalAmount, // <--- AHORA CON IVA/IRPF INCLUIDO
      taxType: type
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
