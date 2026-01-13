const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const {
  purchpostInvoice,
  purchPostInvoiceLine,
  Vendor,
} = sequelize.models

class purchPostInvoice {

  constructor() { }

  async countAll() {
      try {
        // Sequelize's count() method returns the total number of records
        const totalCount = await purchpostInvoice.count();
        console.log(`Total de facturas compra registradas encontrados: ${totalCount}`);
        return totalCount;
      } catch (error) {
        console.error('Error al contar los facturas:', error);
        throw boom.badImplementation('Error al contar los facturas', error); // Usa Boom para errores
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

    const purchpostInvoice = await purchpostInvoice.findAll(options);
    return purchpostInvoice;
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
          { code: { [Op.iLike]: searchTerm } },
          { name: { [Op.iLike]: searchTerm } }
        ];
      } else {
        options.where.code = {
          [Op.iLike]: `%${searchTerm}`
        }
      }
    }

    try {
      const { count, rows } = await purchpostInvoice.findAndCountAll(options);

      return {
        purchpostInvoice: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en purchPostInvoice.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar presupuestos paginados', error);
    }
  }


  async findOne(code, options = {}) { // Usamos un objeto options para mayor flexibilidad
    const { includeLines = false, includeVendor = false } = options;

    const queryOptions = {
      where: {
        code: code,
      },
      include: [] // Inicializamos un array de inclusiones
    };

    if (includeVendor) {
      queryOptions.include.push({
        model: Vendor,
        as: 'vendor' // Asegúrate de que este alias coincida con purchpostInvoice.associate
      });
    }

    if (includeLines) {
      queryOptions.include.push({
        model: purchPostInvoiceLine,
        as: 'lines' // Asegúrate de que este alias coincida con purchpostInvoice.associate
      });
    }

    // Si no hay inclusiones, eliminamos la propiedad 'include' para evitar errores de Sequelize
    if (queryOptions.include.length === 0) {
      delete queryOptions.include;
    }

    const purchpostInvoicesalesPostInvoice = await purchpostInvoice.findByPk(code, queryOptions);
    if (!purchpostInvoicesalesPostInvoice) {
      throw boom.notFound('Presupuesto no encontrado');
    }
    return purchpostInvoicesalesPostInvoice;
  }

  async getTotalByBudget(budgetCode) {
      try {
        const totalFacturado = await purchpostInvoice.sum('amountWithVAT', {
          where: {
            budgetCode: budgetCode,
          },
        });

        // Si no se encuentra ninguna factura, la suma será null.
        // Retornamos 0 en ese caso para evitar errores.
        return totalFacturado || 0;
      } catch (error) {
        console.error("Error al obtener el total facturado por presupuesto:", error);
        throw boom.internal('Error al calcular el total facturado.');
      }
    }

  async create(data) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const newpurchPostInvoice = await purchpostInvoice.create(data, { transaction });

      // Preparar los datos para la primera línea vacía
      // Asegúrate de que estos valores por defecto sean aceptables por tu modelo purchPostInvoiceLine
      const emptyItemData = {
        codeInvoice: newpurchPostInvoice.code,
        lineNo: 1,
        codeItem: '',
        description: '',
        quantity: 0,
        unitMeasure: 'UNIDAD',
        quantityUnitMeasure: 0,
        unitPrice: 0.00,
        vat: 0.00,         // Asumiendo que existe un campo 'vat' en purchPostInvoiceLine
        amountLine: 0.00,  // Asumiendo que existe un campo 'amountLine' en purchPostInvoiceLine
        username: data.username || 'Sistema',
      };

      // Crea la primera línea vacía y vinculada dentro de la misma transacción
      await purchPostInvoiceLine.create(emptyItemData, { transaction });

      await transaction.commit(); // Si todo fue bien, confirma la transacción

      const fullBudget = await purchpostInvoice.findByPk(newpurchPostInvoice.code, {
        include: [{
          model: purchPostInvoiceLine,
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
      console.error('Error en salesPostInvoiceService.create (con transacción y primera línea): ', error);
      if (error.name === "SequelizeUniqueConstraintError") {
        throw boom.conflict(`El código de Factura '${data.code}' ya existe. Intenta otro.`);
      }
      throw boom.badImplementation('Error al crear el Factura y su primera línea', error);
    }
  }

  async update(code, changes) {
    console.log(`\n--- DEBUG: Dentro de purchPostInvoice.update(${code}, changes) ---`);
    console.log("Cambios recibidos (body):", JSON.stringify(changes, null, 2));

    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const purchPostInvoiceInstance = await purchpostInvoice.findOne({
        where: { code },
        transaction
      });

      if (!purchPostInvoiceInstance) {
        throw boom.notFound('Factura no encontrada');
      }

      await purchPostInvoiceInstance.update(headerChanges, { transaction });

      // Eliminar todas las líneas existentes para este Factura
      await purchPostInvoiceLine.destroy({
        where: { codeInvoice: code },
        transaction
      });

      // Depuración: Confirma si las líneas se borraron antes de insertar
      console.log(`DEBUG: Líneas existentes borradas para codeInvoice: ${code}`);

      if (lines && lines.length > 0) {
        const linesToInsert = lines.map(line => ({
          ...line,
          codeInvoice: code
        }));

        await purchPostInvoiceLine.bulkCreate(linesToInsert, {
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

      const updatedPurchPostInvoiceWithLines = await this.findOne(code, { includeLines: true });

      console.log("Factura actualizado (con líneas):", JSON.stringify(updatedPurchPostInvoiceWithLines, null, 2));
      return updatedPurchPostInvoiceWithLines;

    } catch (error) {
      await transaction.rollback();
      console.error("Error al actualizar el Factura y las líneas:", error);
      // Si el error tiene detalles de Sequelize, imprímelos
      if (error.errors) {
        console.error("Detalles del error de Sequelize:", JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }
  }

  async delete(code) {
    console.log(`\n--- DEBUG: Dentro de salesPostInvoiceService.delete(${code}) ---`);

    const purchPostInvoiceToDelete = await this.findOne({
      where: { code }
    });

    if (!purchPostInvoiceToDelete) {
      throw new Error(`Presupuesto con código ${code} no encontrado`); // Lanza un error si no existe
    }

    await purchpostInvoice.destroy();

    console.log(`Factura ${code} y sus líneas eliminadas correctamente (vía CASCADE).`);
    return { code, message: 'Eliminado correctamente' };
  }
}

module.exports = purchPostInvoice;
