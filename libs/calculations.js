const calculateTransactionTotals = (lines = []) => {
  let netoAcumulado = 0;
  let ivaAcumulado = 0;

  const processedLines = lines.map((line) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unitPrice) || 0;
    const vPerc = parseFloat(line.vat) || 0;

    const baseLinea = Math.round(qty * price * 100) / 100;
    const ivaLinea = Math.round(baseLinea * (vPerc / 100) * 100) / 100;

    netoAcumulado += baseLinea;
    ivaAcumulado += ivaLinea;

    return {
      ...line,
      quantity: qty,
      unitPrice: price,
      vat: vPerc,
      amountLine: Number((baseLinea + ivaLinea).toFixed(2)),
    };
  });

  return {
    processedLines,
    // USAMOS LOS NOMBRES QUE VEO EN TU SELECT DE SQL
    amountWithoutVAT: Number(netoAcumulado.toFixed(2)),
    amountVAT: Number(ivaAcumulado.toFixed(2)),
    amountWithVAT: Number((netoAcumulado + ivaAcumulado).toFixed(2)),
  };
};

module.exports = { calculateTransactionTotals };
