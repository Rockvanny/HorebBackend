const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

// Extraemos los modelos correctamente del objeto sequelize
const {
  salesBudget,
  salesBudgetLine,
  Customer,
} = sequelize.models;

class salesBudgetService {
  constructor() { }

  async countAll() {
    try {
      return await salesBudget.count();
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
      const { count, rows } = await salesBudget.findAndCountAll(options);
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
    // Forzamos que solo nos interese includeLines
    const { includeLines = false } = options;

    const queryOptions = {
      where: { code },
      include: []
    };

    if (includeLines) {
      queryOptions.include.push({
        model: sequelize.models.salesBudgetLine,
        as: 'lines',
        // Esto asegura que si no hay líneas, al menos traiga la cabecera
        required: false
      });
    }

    // Usamos findOne para garantizar que las queryOptions se apliquen bien
    const record = await salesBudget.findOne(queryOptions);

    if (!record) {
      throw boom.notFound('Registro no encontrado');
    }

    // CONVERSIÓN A OBJETO PLANO (JSON)
    // Esto es lo que hará que las líneas aparezcan en el proceso de Render de Electron
    return record.get({ plain: true });
  }

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear cabecera (Genera el código via Hook)
      const newSalesBudget = await salesBudget.create(headerData, { transaction });

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
            codeDocument: newSalesBudget.code,
            amountLine: lineAmount
          };
        });
        await salesBudgetLine.bulkCreate(linesToInsert, { transaction });
      } else {
        // Línea por defecto
        await salesBudgetLine.create({
          codeDocument: newSalesBudget.code,
          lineNo: 1,
          description: 'Nueva línea',
          quantity: 1,
          unitPrice: 0,
          amountLine: 0
        }, { transaction });
      }

      // 3. ACTUALIZAR TOTALES EN CABECERA
      // (Para que la tabla de lista y la ficha coincidan)
      await newSalesBudget.update({
        amountWithoutVAT: totalNeto,
        amountVAT: totalIva,
        amountWithVAT: totalNeto + totalIva
      }, { transaction });

      await transaction.commit();
      return await this.findOne(newSalesBudget.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update(code, changes) {
    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const instance = await salesBudget.findByPk(code, { transaction });
      if (!instance) throw boom.notFound('Registro no encontrado');

      // 1. Actualizar cabecera
      await instance.update(headerChanges, { transaction });

      // 2. Sincronizar líneas si vienen en el body
      if (lines) {
        // Borrar líneas existentes
        await salesBudgetLine.destroy({
          where: { codeDocument: code },
          transaction
        });

        if (lines.length > 0) {
          const linesToInsert = lines.map((line, index) => {
            // Extraemos id para evitar conflictos en la inserción de nuevos registros
            const { id, ...lineData } = line;
            return {
              ...lineData,
              codeDocument: code,
              lineNo: line.lineNo || (index + 1),
              // Aseguramos que el username persista si no viene en la línea
              username: line.username || headerChanges.username || 'system'
            };
          });
          await salesBudgetLine.bulkCreate(linesToInsert, { transaction });
        } else {
          // Opcional: Si el front envía array vacío, recrear la línea por defecto
          // para que el documento nunca se quede sin líneas.
          await salesBudgetLine.create({
            codeDocument: code,
            lineNo: 1,
            description: 'Nueva línea',
            quantity: 1.0,
            unitPrice: 0.0,
            vat: 0.0,
            amountLine: 0.0,
            username: headerChanges.username || 'Sistema'
          }, { transaction });
        }
      }

      await transaction.commit();
      // Importante: includeLines debe ser true para que el front reciba la actualización
      return await this.findOne(code, { includeLines: true, includeCustomer: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete(code) {
    const instance = await salesBudget.findByPk(code);
    if (!instance) throw boom.notFound('Registro no encontrado');
    await instance.destroy();
    return { code, message: 'Registro eliminado correctamente' };
  }
}

module.exports = salesBudgetService;
