const { Op } = require('sequelize');
const boom = require('@hapi/boom');

/**
 * MAPEO DE TRADUCCIÓN TÉCNICA
 * Vincula el nombre del modelo de Sequelize con el 'type' de la tabla series_numbers.
 */
const MODEL_SERIES_MAP = {   // Traducción: Modelo salesBudget -> Serie budget
    'Customer': 'customer',
    'Product': 'product',
    'Vendor': 'vendor',
    'salesBudget': 'budget',
    'salesInvoice': 'salesinvoice',
};

/**
 * Genera el siguiente código secuencial basado en la serie seleccionada.
 */
async function generateNextCode(instance, options) {
  try {
    // 1. OBTENCIÓN ROBUSTA DEL NOMBRE DEL MODELO
    const modelName = instance.constructor.options?.name?.singular ||
                      instance.constructor.name ||
                      (instance._modelOptions && instance._modelOptions.name.singular);

    if (!modelName) {
      throw new Error("No se pudo determinar el nombre del modelo en el Hook de numeración.");
    }

    // 2. TRADUCCIÓN DE TIPO
    // Si el modelo está en el mapa (ej. salesBudget), usamos su alias (budget).
    // Si no está, usamos el nombre del modelo en minúsculas por defecto.
    const type = MODEL_SERIES_MAP[modelName] || modelName.toLowerCase();

    // 3. ACCESO A MODELOS
    const { seriesNumber } = instance.sequelize.models;

    if (!seriesNumber) {
      throw new Error(`El modelo 'seriesNumber' no está cargado en Sequelize.`);
    }

    const today = new Date().toISOString().split('T')[0];

    // 4. CONFIGURACIÓN DE BÚSQUEDA
    const findOptions = {
      where: {
        type: type, // Aquí buscará 'budget'
        fromDate: { [Op.lte]: today },
        toDate: { [Op.gte]: today }
      }
    };

    // Aplicar bloqueo de fila si estamos en una transacción para evitar duplicados
    if (options.transaction) {
      findOptions.transaction = options.transaction;
      findOptions.lock = options.transaction.LOCK.UPDATE;
    }

    // Filtramos por la serie específica enviada desde el front (si existe)
    if (instance.selectedSerie) {
      findOptions.where.startSerie = instance.selectedSerie;
    }

    // 5. BÚSQUEDA DE LA SERIE
    const serie = await seriesNumber.findOne(findOptions);

    if (!serie) {
      throw boom.badRequest(
        `No existe serie activa ('${instance.selectedSerie || 'DEFAULT'}') para el tipo '${type}' en la fecha ${today}.`
      );
    }

    // 6. CÁLCULO DEL NUEVO CÓDIGO
    const nextNumber = (serie.lastNumber || 0) + 1;
    const formattedNumber = nextNumber.toString().padStart(serie.digits || 4, '0');

    // Asignamos el código final a la instancia
    instance.code = `${serie.prefix || ''}${formattedNumber}`;

    // 7. ACTUALIZACIÓN DEL CONTADOR
    await serie.update({ lastNumber: nextNumber }, {
      transaction: options.transaction || null
    });

    console.log(`[Sequence] Código generado con éxito para modelo ${modelName} (Tipo DB: ${type}): ${instance.code}`);

  } catch (error) {
    console.log("--- DEBUG HOOK ERROR START ---");
    console.error("Modelo detectado:", instance.constructor.name);
    console.error("Mensaje:", error.message);
    console.log("--- DEBUG HOOK ERROR END ---");

    throw error;
  }
}

module.exports = { generateNextCode };
