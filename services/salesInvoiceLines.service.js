const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesInvoiceLine } = sequelize.models;

class salesInvoiceLineService {
  async findOne(id) {
    const line = await salesInvoiceLine.findByPk(id);
    if (!line) throw boom.notFound(`Línea con ID ${id} no encontrada`);
    return line;
  }

  async create(data) {
    // Verificamos el índice único de negocio manualmente para dar un error bonito
    const existingLine = await salesInvoiceLine.findOne({
      where: { codeDocument: data.codeDocument, lineNo: data.lineNo }
    });
    if (existingLine) throw boom.conflict(`La línea ${data.lineNo} ya existe en el documento ${data.codeDocument}`);

    return await salesInvoiceLine.create(data);
  }

  async update(id, changes) {
    const line = await this.findOne(id);
    // Evitamos que cambien el ID manualmente
    delete changes.id;
    return await line.update(changes);
  }

  async delete(id) {
    const line = await this.findOne(id);
    await line.destroy();
    return { id, message: 'Eliminado correctamente' };
  }
}

module.exports = salesInvoiceLineService;
