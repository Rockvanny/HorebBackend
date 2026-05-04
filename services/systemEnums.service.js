const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class SystemEnumService {
  constructor() {}

  // Crear un nuevo registro de diccionario
  async create(data) {
    const newEnum = await models.SystemEnum.create(data);
    return newEnum;
  }

  // Buscar todos los registros (usado en la tabla de configuración)
  async find() {
    const options = {
      where: {},
      order: [['model', 'ASC'], ['field', 'ASC'], ['sort_order', 'ASC']]
    };
    const result = await models.SystemEnum.findAll(options);
    return result;
  }

  // Buscar por ID específico
  async findOne(id) {
    const systemEnum = await models.SystemEnum.findByPk(id);
    if (!systemEnum) {
      throw boom.notFound('System Enum not found');
    }
    return systemEnum;
  }

  /**
   * Método clave para el Frontend:
   * Retorna los enums filtrados por modelo y campo, ordenados
   */
  async findByField(modelName, fieldName) {
    const enums = await models.SystemEnum.findAll({
      where: {
        model: modelName,
        field: fieldName,
        isActive: true
      },
      order: [['sort_order', 'ASC'], ['description', 'ASC']]
    });
    return enums;
  }

  // Actualizar un registro
  async update(id, changes) {
    const systemEnum = await this.findOne(id);
    const rta = await systemEnum.update(changes);
    return rta;
  }

  // Borrado lógico (gracias a paranoid: true en el modelo)
  async delete(id) {
    const systemEnum = await this.findOne(id);
    await systemEnum.destroy();
    return { id };
  }
}

module.exports = SystemEnumService;
