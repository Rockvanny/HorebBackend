/**
 * Procesa un array de líneas y devuelve los totales y el desglose de impuestos
 * @param {Array} lines - Líneas del documento (deben traer taxType)
 * @param {String} movementId - UUID del documento padre
 * @param {String} docType - Tipo de documento (salesinvoice, salespostinvoice, etc.)
 */
const calculateDocumentTotals = (lines, movementId, docType) => {
  let totalNeto = 0;
  let totalImpuestos = 0; // Cambiamos totalIva por totalImpuestos (suma y resta)
  const taxGroups = {};

  const processedLines = lines.map((line, index) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unitPrice) || 0;
    const factor = parseFloat(line.quantityUnitMeasure) || 1;
    const vatPerc = parseFloat(line.vat) || 0;
    const type = line.taxType || 'IVA'; // <--- Tomamos el tipo de la línea

    const lineAmount = qty * factor * price;

    // Cálculo de la cuota: El IRPF resta, el IVA suma
    const isRetencion = type === 'IRPF';
    const lineVat = lineAmount * (vatPerc / 100);

    totalNeto += lineAmount;

    // Si es retención, resta del total a pagar; si no, suma.
    if (isRetencion) {
      totalImpuestos -= lineVat;
    } else {
      totalImpuestos += lineVat;
    }

    // CLAVE ÚNICA: Agrupamos por TIPO + PORCENTAJE (ej: "IVA_21" o "IRPF_15")
    const groupKey = `${type}_${vatPerc}`;

    if (!taxGroups[groupKey]) {
      taxGroups[groupKey] = {
        movementId: movementId,
        codeDocument: docType,
        taxType: type, // <--- Dinámico: IVA, IRPF, RE, etc.
        taxPercentage: vatPerc,
        taxableAmount: 0,
        taxAmount: 0
      };
    }

    taxGroups[groupKey].taxableAmount += lineAmount;
    taxGroups[groupKey].taxAmount += lineVat;

    return {
      ...line,
      lineNo: line.lineNo || (index + 1),
      amountLine: lineAmount,
      taxType: type // Aseguramos que la línea procesada mantenga el tipo
    };
  });

  return {
    processedLines,
    taxesToInsert: Object.values(taxGroups),
    headerTotals: {
      amountWithoutVAT: totalNeto,
      amountVAT: totalImpuestos, // Refleja el neto de impuestos (IVA - IRPF)
      amountWithVAT: totalNeto + totalImpuestos
    }
  };
};

module.exports = { calculateDocumentTotals };
