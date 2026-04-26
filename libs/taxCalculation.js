// Backend/utils/taxCalculations.js

/**
 * Procesa un array de líneas y devuelve los totales y el desglose de impuestos
 * @param {Array} lines - Líneas del documento
 * @param {String} movementId - UUID del documento padre
 * @param {String} docType - Tipo de documento (budget, salesinvoice, etc.)
 */
const calculateDocumentTotals = (lines, movementId, docType) => {
  let totalNeto = 0;
  let totalIva = 0;
  const taxGroups = {};

  const processedLines = lines.map((line, index) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unitPrice) || 0;
    const factor = parseFloat(line.quantityUnitMeasure) || 1;
    const vatPerc = parseFloat(line.vat) || 0;

    const lineAmount = qty * factor * price;
    const lineVat = lineAmount * (vatPerc / 100);

    totalNeto += lineAmount;
    totalIva += lineVat;

    // Agrupación para DocumentTax
    if (!taxGroups[vatPerc]) {
      taxGroups[vatPerc] = {
        movementId: movementId,
        codeDocument: docType,
        taxType: 'IVA',
        taxPercentage: vatPerc,
        taxableAmount: 0,
        taxAmount: 0
      };
    }
    taxGroups[vatPerc].taxableAmount += lineAmount;
    taxGroups[vatPerc].taxAmount += lineVat;

    return {
      ...line,
      lineNo: line.lineNo || (index + 1),
      amountLine: lineAmount
    };
  });

  return {
    processedLines,
    taxesToInsert: Object.values(taxGroups),
    headerTotals: {
      amountWithoutVAT: totalNeto,
      amountVAT: totalIva,
      amountWithVAT: totalNeto + totalIva
    }
  };
};

module.exports = { calculateDocumentTotals };
