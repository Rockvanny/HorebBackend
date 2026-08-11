/**
 * Procesa un array de líneas y devuelve los totales y el desglose de impuestos
 * @param {Array} lines - Líneas del documento (deben traer ancho, alto, etc.)
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
    const isRetencion = type === 'IRPF';
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
      amountLine: lineFinalAmount,
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
