const boom = require('@hapi/boom');
const { Op } = require('sequelize'); // ¡No olvides esta línea!

async function generateNextCode(instance, options) {
  // Obtenemos el nombre del modelo para buscar la serie (ej: 'Customer')
  const type = instance.constructor.modelName.toUpperCase();
  const { seriesNumber } = instance.sequelize.models;

  // Fecha de hoy en formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // 1. Buscamos la serie vigente
  const serie = await seriesNumber.findOne({
    where: {
      type: type,
      fromDate: { [Op.lte]: today }, // fromDate <= hoy
      toDate: { [Op.gte]: today }    // toDate >= hoy
    },
    transaction: options.transaction,
    lock: options.transaction.LOCK.UPDATE // Bloqueo de fila por seguridad
  });

  // 2. Si no hay serie activa, lanzamos el error que pediste
  if (!serie) {
    throw boom.badRequest(
      `No existe una numeración activa para '${type}' en la fecha ${today}. Por favor, configúrela en Ajustes.`
    );
  }

  // 3. Calculamos el nuevo número alfanumérico
  const nextNumber = serie.lastNumber + 1;
  const formattedNumber = nextNumber.toString().padStart(serie.digits, '0');

  // Asignamos el resultado (Ej: CL + 0001 = CL0001)
  instance.code = `${serie.prefix}${formattedNumber}`;

  // 4. "Quemamos" el número en la base de datos
  await serie.update({ lastNumber: nextNumber }, {
    transaction: options.transaction
  });
}

module.exports = { generateNextCode };
