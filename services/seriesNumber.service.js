const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class seriesNumberService {

  constructor() {
   }

  async find(queryParams) {
    console.log("Parametros recibidos en find() ", queryParams);
    const whereClause = {};

    if (queryParams.type) {
      whereClause.type = queryParams.type; // Aplica el filtro solo si "type" está presente
    }

    const rta = await models.seriesNumber.findAll({ where: whereClause });
    return rta;
  }


  async findPaginated({ limit, offset, serieNoStart, serieNoType }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['startSerie', 'ASC']],
      where: {},
    }

    // Este bloque SOLO se ejecuta si 'serieNoStart' tiene un valor
    if (serieNoStart) {
      const startSerieSearchPattern = serieNoStart.includes('%') ? serieNoStart : `%${serieNoStart}%`;
      options.where.startSerie = { [Op.iLike]: startSerieSearchPattern };
    }

    // Este bloque SOLO se ejecuta si 'serieNoType' tiene un valor
    if (serieNoType) {
      if (serieNoType.includes('%')) {
        const typeSearchPattern = serieNoType.includes('%') ? serieNoType : `%${serieNoType}%`;
        options.where.type = { [Op.iLike]: typeSearchPattern };
      }
    }

    try {
      const { count, rows } = await models.seriesNumber.findAndCountAll(options);

      return {
        seriesNo: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en SeiresNumberService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar números de serie paginados', error);
    }
  }

  async findByType(type) {
    try {
      const series = await models.seriesNumber.findAll({
        where: { type }
      });
      console.log(`[SeriesNumberService.findByType] Resultados encontrados:`, series.length);
      return series;
    } catch (error) {
      console.error("[SeriesNumberService.findByType] Error al buscar numeraciones por tipo:", error);
      throw error;
    }
  }

  async getAllowedTypes() {
    const types = await models.seriesNumber.findAll({ attributes: ['type'], group: ['type'] });
    return types.map(t => t.type); //Extrae y devuelve solo los valores únicos de `type`
  }

  async findOne(type, startSerie) {
    // Construimos la cláusula 'where' dinámicamente
    const whereClause = {
      startSerie: startSerie // startSerie siempre es requerido para esta búsqueda
    };

    if (type) {
      // Si 'type' se proporciona (no es null ni undefined ni vacío), lo añadimos a la cláusula where
      whereClause.type = type;
    }

    const serieNumber = await models.seriesNumber.findOne({
      where: whereClause // Usamos la cláusula 'where' construida dinámicamente
    });

    if (!serieNumber) {
      // Mensaje de error más específico si no se encuentra
      if (type) {
        throw boom.notFound(`Serie Number with type '${type}' and startSerie '${startSerie}' not found`);
      } else {
        throw boom.notFound(`Serie Number with startSerie '${startSerie}' not found`);
      }
    }

    return serieNumber;
  }

  async create(data) {
    const newSerieNumber = await models.seriesNumber.create(data); //Eliminado "include: ['user']"
    return newSerieNumber;
  }

  async update(type, startSerie, changes) {
    try {
      console.log("Serie a actualizar: ", type, "código: ", startSerie, "Data: ", changes)
      const model = await this.findOne(type, startSerie);
      const updatedSerieNumber = await model.update(changes);
      return updatedSerieNumber;
    } catch (error) {
      // Manejo de errores específicos de Sequelize y otros errores
      console.error("[SeriesNumberService.update] Error al actualizar la numeración:", error);
    }
  }

  async updateLastUsedSerie(type, startSerie) {
    try {
      // 1. Buscar el registro existente en la base de datos
      const model = await models.seriesNumber.findOne({
        where: { type, startSerie }
      });

      if (!model) {
        throw new Error(`No se encontró la serie con type: ${type}, startSerie: ${startSerie}`);
      }

      // 2. Validar si `lastSerie` es vacío o `null`
      let newLastSerie;
      if (!model.lastSerie || model.lastSerie.trim() === "") {
        newLastSerie = startSerie;
      } else {
        // Extraer el prefijo y la parte numérica
        const prefix = model.lastSerie.match(/[A-Za-z]+/)[0]; // Extrae "PROD"
        const numberPart = model.lastSerie.match(/\d+/)[0]; // Extrae "000"

        // Incrementar el número y mantener la misma longitud
        const newNumber = String(parseInt(numberPart) + 1).padStart(numberPart.length, '0');

        // Concatenar el prefijo con el nuevo número
        newLastSerie = prefix + newNumber;
      }

      // 3. Actualizar usando `model.update()`
      await model.update({ lastSerie: newLastSerie });

      // 4. Retornar el nuevo número de serie
      return newLastSerie;
    } catch (error) {
      throw new Error("Error al actualizar el número de serie: " + error.message);
    }
  }

  async delete(type, startSerie) {
    const model = await this.findOne(type, startSerie);
    await model.destroy();

    // Mensaje de confirmación de eliminación
    return { message: 'Serie Number eliminado correctamente' };
  }
}

module.exports = seriesNumberService;
