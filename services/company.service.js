const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class CompanyService {

  constructor() { }

  async find(query) {
    const options = {
      where: {}
    }

    const { limit, offset } = query;
    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }

    const company = await models.Company.findAll(options);
    return company;
  }

  async findOne(code) {
    const queryOptions = {};

    const company = await models.Company.findByPk(code, queryOptions);
    if (!company) {
      throw boom.notFound('Empresa no encontrada');
    }
    return company;
  }

  async create(data) {
    const newCompany = await models.Company.create(data);
    return newCompany;
  }

  // Este método necesita obtener un producto existente para actualizarlo.
  // Por lo tanto, debe utilizar el propio método 'this.findOne()' del servicio.
  async update(code, changes) {
    console.log(`\n--- DEBUG: Dentro de CompanyService.update(${code}, changes) ---`);
    const company = await this.findOne(code);

    const updatedCompany = await company.update(changes);
    return updatedCompany;
  }

  async delete(code) {
    const companyToDelete = await this.findOne(code); // Tampoco es necesario que delete traiga las asociaciones completas
    if (!companyToDelete) {
      throw new Error(`empresa con código ${code} no encontrado`);
    }

    // Aquí, onDelete: 'RESTRICT' en las FK de las facturas se encargará de que falle si tiene documentos asociados
    await models.Company.destroy({
      where: {
        code: code
      }
    });

    return { code };
  }

}

module.exports = CompanyService;
