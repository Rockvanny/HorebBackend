const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const {
  salesBudget,
  salesBudgetLine,
  Customer,
} = sequelize.models

class salesBudgetService {

  constructor() { }

  async countAll() {
    try {
      // Sequelize's count() method returns the total number of records
      const totalCount = await salesBudget.count();
      console.log(`Total de presupuestos encontrados: ${totalCount}`);
      return totalCount;
    } catch (error) {
      console.error('Error al contar los presupuestos:', error);
      throw boom.badImplementation('Error al contar los presupuestos', error); // Usa Boom para errores
    }
  }

  async find(query) {
    const options = {
      where: {}
    }

    const { limit, offset } = query;
    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }

    const salesBudgets = await salesBudget.findAll(options);
    return salesBudgets;
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['code', 'ASC']],
      where: {},
    }

    if (searchTerm) {
      if (searchTerm.includes('%')) {
        options.where[Op.or] = [
          { code: { [Op.iLike]: `%${searchTerm}%` } },
          { name: { [Op.iLike]: `%${searchTerm}%` } }
        ];
      } else {
        options.where.code = {
          [Op.iLike]: `%${searchTerm}`
        }
      }
    }

    try {
      const { count, rows } = await salesBudget.findAndCountAll(options);

      return {
        salesBudget: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en salesBudgetService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar presupuestos paginados', error);
    }
  }

  async findOne(code, options = {}) { // Usamos un objeto options para mayor flexibilidad
    const { includeLines = false, includeCustomer = false } = options;

    const queryOptions = {
      where: {
        code: code,
      },
      include: [] // Inicializamos un array de inclusiones
    };

    if (includeCustomer) {
      queryOptions.include.push({
        model: Customer,
        as: 'customer' // Asegúrate de que este alias coincida con salesBudget.associate
      });
    }

    if (includeLines) {
      queryOptions.include.push({
        model: salesBudgetLine,
        as: 'lines' // Asegúrate de que este alias coincida con salesBudget.associate
      });
    }

    // Si no hay inclusiones, eliminamos la propiedad 'include' para evitar errores de Sequelize
    if (queryOptions.include.length === 0) {
      delete queryOptions.include;
    }

    const salesBudgetFound = await salesBudget.findByPk(code, queryOptions);
    if (!salesBudgetFound) {
      throw boom.notFound('Presupuesto no encontrado');
    }
    return salesBudgetFound;
  }


  async create(data) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const newSalesBudget = await salesBudget.create(data, { transaction });

      // Preparar los datos para la primera línea vacía
      // Asegúrate de que estos valores por defecto sean aceptables por tu modelo salesBudgetLine
      const emptyItemData = {
        codeBudget: newSalesBudget.code,
        lineNo: 1,
        codeItem: '',
        description: '',
        quantity: 0,
        unitMeasure: 'UNIDAD',
        quantityUnitMeasure: 0,
        unitPrice: 0.00,
        vat: 0.00,         // Asumiendo que existe un campo 'vat' en salesBudgetLine
        amountLine: 0.00,  // Asumiendo que existe un campo 'amountLine' en salesBudgetLine
        username: data.username || 'Sistema',
      };

      // Crea la primera línea vacía y vinculada dentro de la misma transacción
      await salesBudgetLine.create(emptyItemData, { transaction });

      await transaction.commit(); // Si todo fue bien, confirma la transacción

      const fullBudget = await salesBudget.findByPk(newSalesBudget.code, {
        include: [{
          model: salesBudgetLine,
          as: 'lines'
        }]
      });

      console.log('--- DEBUG: fullBudget devuelto por el servicio ---');
      console.log(JSON.stringify(fullBudget, null, 2)); // Para ver el objeto completo, con sus anidamientos
      console.log('--- FIN DEBUG ---');

      return fullBudget;
    } catch (error) {
      // Solo intenta hacer rollback si la transacción aún está activa (no ha terminado)
      if (transaction && !transaction.finished) { // <--- CAMBIO CLAVE AQUÍ
        await transaction.rollback();
      }
      console.error('Error en salesInvoiceService.create (con transacción y primera línea): ', error);
      if (error.name === "SequelizeUniqueConstraintError") {
        throw boom.conflict(`El código de presupuesto '${data.code}' ya existe. Intenta otro.`);
      }
      throw boom.badImplementation('Error al crear el presupuesto y su primera línea', error);
    }
  }

  async update(code, changes) {
    console.log(`\n--- DEBUG: Dentro de salesBudgetService.update(${code}, changes) ---`);
    console.log("Cambios recibidos (body):", JSON.stringify(changes, null, 2));

    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const salesBudgetInstance = await salesBudget.findOne({
        where: { code },
        transaction
      });

      if (!salesBudgetInstance) {
        throw boom.notFound('Presupuesto no encontrado');
      }

      await salesBudgetInstance.update(headerChanges, { transaction });

      // Eliminar todas las líneas existentes para este presupuesto
      await salesBudgetLine.destroy({
        where: { codeBudget: code },
        transaction
      });

      // Depuración: Confirma si las líneas se borraron antes de insertar
      console.log(`DEBUG: Líneas existentes borradas para codeBudget: ${code}`);

      if (lines && lines.length > 0) {
        const linesToInsert = lines.map(line => ({
          ...line,
          codeBudget: code
        }));

        await salesBudgetLine.bulkCreate(linesToInsert, {
          transaction,

          updateOnDuplicate: [
            'item_code',
            'description',
            'quantity',
            'unit_measure',
            'quantity_unit_measure',
            'unit_price',
            'vat',
            'amount_line',
            'user_name',
            'updated_at'
          ]
        });
        console.log("DEBUG: bulkCreate (con updateOnDuplicate) completado exitosamente.");
      }

      await transaction.commit();

      const updatedSalesBudgetWithLines = await this.findOne(code, { includeLines: true });

      console.log("Presupuesto actualizado (con líneas):", JSON.stringify(updatedSalesBudgetWithLines, null, 2));
      return updatedSalesBudgetWithLines;

    } catch (error) {
      await transaction.rollback();
      console.error("Error al actualizar el presupuesto y las líneas:", error);
      // Si el error tiene detalles de Sequelize, imprímelos
      if (error.errors) {
        console.error("Detalles del error de Sequelize:", JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }
  }

  async delete(code) {
    console.log(`\n--- DEBUG: Dentro de salesBudgetService.delete(${code}) ---`);

    const salesBudgetToDelete = await salesBudget.findOne({
      where: { code }
    });

    if (!salesBudgetToDelete) {
      throw boom.notFound(`Presupuesto con código ${code} no encontrado para eliminar`);
    }

    await salesBudgetToDelete.destroy();

    console.log(`Presupuesto ${code} y sus líneas eliminadas correctamente (vía CASCADE).`);
    return { code, message: 'Eliminado correctamente' };
  }
}

module.exports = salesBudgetService;
