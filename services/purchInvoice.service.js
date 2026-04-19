const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

// Extraemos los modelos correctamente del objeto sequelize
const {
  purchInvoice,
  purchInvoiceLine,
  Vendor,
} = sequelize.models;

class purchInvoiceService {
  constructor() { }

  async countAll() {
    try {
      return await purchInvoice.count();
    } catch (error) {
      throw boom.badImplementation('Error al contar los registros', error);
    }
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {},
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { nif: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await purchInvoice.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar registros paginados', error);
    }
  }

  async findOne(code, options = {}) {
    // Forzamos que solo nos interese includeLines (Igual que en la oferta)
    const { includeLines = false } = options;

    const queryOptions = {
      where: { code },
      include: []
    };

    if (includeLines) {
      queryOptions.include.push({
        model: purchInvoiceLine,
        as: 'lines',
        required: false
      });
    }

    const record = await purchInvoice.findOne(queryOptions);

    if (!record) {
      throw boom.notFound('Registro no encontrado');
    }

    return record.get({ plain: true });
  }

  async findStatuses() {
    try {
      const attributes = purchInvoice.getAttributes();

      if (attributes.status && attributes.status.values) {
        return attributes.status.values;
      }

      // Fallback sincronizado
      return ['Borrador', 'Abierto', 'Pagado'];
    } catch (error) {
      console.error("Error en findStatuses:", error);
      throw boom.badImplementation('No se pudieron obtener los estados');
    }
  }

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear cabecera (Genera el código via Hook)
      const newInvoice = await purchInvoice.create(headerData, { transaction });

      let totalNeto = 0;
      let totalIva = 0;

      // 2. Procesar líneas
      if (lines && lines.length > 0) {
        const linesToInsert = lines.map((line, index) => {
          const qty = parseFloat(line.quantity) || 0;
          const price = parseFloat(line.unitPrice) || 0;
          const factor = parseFloat(line.quantityUnitMeasure) || 1;
          const vatPerc = parseFloat(line.vat) || 0;

          const lineAmount = qty * factor * price;
          const lineVat = lineAmount * (vatPerc / 100);

          totalNeto += lineAmount;
          totalIva += lineVat;

          return {
            ...line,
            lineNo: line.lineNo || (index + 1),
            codeDocument: newInvoice.code,
            amountLine: lineAmount
          };
        });
        await purchInvoiceLine.bulkCreate(linesToInsert, { transaction });
      } else {
        // Línea por defecto igual que en la oferta
        await purchInvoiceLine.create({
          codeDocument: newInvoice.code,
          lineNo: 1,
          description: 'Nueva línea',
          quantity: 1,
          unitPrice: 0,
          amountLine: 0
        }, { transaction });
      }

      // 3. ACTUALIZAR TOTALES EN CABECERA
      await newInvoice.update({
        amountWithoutVAT: totalNeto,
        amountVAT: totalIva,
        amountWithVAT: totalNeto + totalIva
      }, { transaction });

      await transaction.commit();
      return await this.findOne(newInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update(code, changes) {
    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const instance = await purchInvoice.findOne({ where: { code }, transaction });
      if (!instance) throw boom.notFound('Registro no encontrado');

      // Limpieza de campos (Seguridad Postgres)
      const cleanHeader = { ...headerChanges };
      delete cleanHeader.id;
      delete cleanHeader.code;
      delete cleanHeader.createdAt;
      delete cleanHeader.updatedAt;

      // 1. Actualizar cabecera
      await instance.update(cleanHeader, { transaction });

      // 2. Sincronizar líneas (Lógica Flush & Fill)
      if (lines) {
        await purchInvoiceLine.destroy({
          where: { codeDocument: code },
          transaction
        });

        if (lines.length > 0) {
          const linesToInsert = lines.map((line, index) => {
            const { id, ...lineData } = line;
            return {
              ...lineData,
              codeDocument: code,
              lineNo: line.lineNo || (index + 1),
              username: line.username || cleanHeader.username || 'system'
            };
          });
          await purchInvoiceLine.bulkCreate(linesToInsert, { transaction });
        } else {
          // Línea por defecto si se vacía
          await purchInvoiceLine.create({
            codeDocument: code,
            lineNo: 1,
            description: 'Nueva línea',
            quantity: 1.0,
            unitPrice: 0.0,
            vat: 0.0,
            amountLine: 0.0,
            username: cleanHeader.username || 'Sistema'
          }, { transaction });
        }
      }

      await transaction.commit();
      return await this.findOne(code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("Error detallado en Sequelize Update:", error);
      throw error;
    }
  }

  async delete(code) {
    const instance = await purchInvoice.findByPk(code);
    if (!instance) throw boom.notFound('Registro no encontrado');
    await instance.destroy();
    return { code, message: 'Registro eliminado correctamente' };
  }
}

module.exports = purchInvoiceService;
