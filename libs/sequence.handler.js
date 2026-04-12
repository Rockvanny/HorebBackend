const { Op } = require('sequelize');
const boom = require('@hapi/boom');

/**
 * Genera el siguiente código secuencial basado en la serie seleccionada.
 * Ajustado para evitar errores de lectura de propiedades en 'instance'.
 */
async function generateNextCode(instance, options) {
  try {
    // 1. OBTENCIÓN ROBUSTA DEL NOMBRE DEL MODELO
    // Intentamos varias vías comunes en Sequelize para obtener el nombre (Customer, Invoice, etc.)
    const modelName = instance.constructor.options?.name?.singular ||
                     instance.constructor.name ||
                     (instance._modelOptions && instance._modelOptions.name.singular);

    if (!modelName) {
      throw new Error("No se pudo determinar el nombre del modelo en el Hook de numeración.");
    }

    const type = modelName.toLowerCase();

    // 2. ACCESO A MODELOS
    // Asegúrate de que en tu index de modelos, 'seriesNumber' esté definido con ese nombre exacto.
    const { seriesNumber } = instance.sequelize.models;

    if (!seriesNumber) {
      throw new Error(`El modelo 'seriesNumber' no está cargado en Sequelize. Revisa la definición del modelo.`);
    }

    const today = new Date().toISOString().split('T')[0];

    // 3. CONFIGURACIÓN DE BÚSQUEDA
    const findOptions = {
      where: {
        type: type,
        fromDate: { [Op.lte]: today },
        toDate: { [Op.gte]: today }
      }
    };

    // Aplicar bloqueo de fila si estamos en una transacción para evitar duplicados
    if (options.transaction) {
      findOptions.transaction = options.transaction;
      findOptions.lock = options.transaction.LOCK.UPDATE;
    }

    // Filtramos por la serie específica enviada desde el campo VIRTUAL del front
    if (instance.selectedSerie) {
      findOptions.where.startSerie = instance.selectedSerie;
    }

    // 4. BÚSQUEDA DE LA SERIE
    const serie = await seriesNumber.findOne(findOptions);

    if (!serie) {
      throw boom.badRequest(
        `No existe serie activa ('${instance.selectedSerie || 'DEFAULT'}') para el tipo '${type}' en la fecha ${today}.`
      );
    }

    // 5. CÁLCULO DEL NUEVO CÓDIGO
    const nextNumber = (serie.lastNumber || 0) + 1;
    const formattedNumber = nextNumber.toString().padStart(serie.digits, '0');

    // Asignamos el código final a la instancia (Ej: CLI-0001)
    // 'code' es el nombre de la columna en tu tabla de Clientes
    instance.code = `${serie.prefix}${formattedNumber}`;

    // 6. ACTUALIZACIÓN DEL CONTADOR
    await serie.update({ lastNumber: nextNumber }, {
      transaction: options.transaction || null
    });

    console.log(`[Sequence] Código generado con éxito para ${type}: ${instance.code}`);

  } catch (error) {
    // Log detallado para desarrollo
    console.log("--- DEBUG HOOK ERROR START ---");
    console.error("Mensaje:", error.message);
    console.error("Nombre Error:", error.name);
    if (error.stack) console.error("Stack:", error.stack);
    console.log("--- DEBUG HOOK ERROR END ---");

    throw error;
  }
}

module.exports = { generateNextCode };
