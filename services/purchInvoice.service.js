const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { purchpostInvoice } = sequelize.models;
const { purchPostInvoiceLine } = sequelize.models;
const seriesNumberService = require('../services/seriesNumber.service');

const {
  purchInvoice,
  purchInvoiceLine,
  Vendor,
} = sequelize.models

class purchInvoiceService {

  constructor() {
    //se inicializa el servicio de números de serie.
    this.seriesNumberService = new seriesNumberService(); }

  async countAll() {
    try {
      // Sequelize's count() method returns the total number of records
      const totalCount = await purchInvoice.count();
      console.log(`Total de facturas compra encontradas: ${totalCount}`);
      return totalCount;
    } catch (error) {
      console.error('Error al contar las facturas:', error);
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

    const puchInvoices = await purchInvoice.findAll(options);
    return puchInvoices;
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
      const { count, rows } = await purchInvoice.findAndCountAll(options);

      return {
        purchInvoice: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en purchInvoiceService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar facturas paginados', error);
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
        as: 'Vendor' // Asegúrate de que este alias coincida con purchInvoice.associate
      });
    }

    if (includeLines) {
      queryOptions.include.push({
        model: purchInvoiceLine,
        as: 'lines' // Asegúrate de que este alias coincida con purchInvoice.associate
      });
    }

    // Si no hay inclusiones, eliminamos la propiedad 'include' para evitar errores de Sequelize
    if (queryOptions.include.length === 0) {
      delete queryOptions.include;
    }

    const purchInvoiceFound = await purchInvoice.findByPk(code, queryOptions);
    if (!purchInvoiceFound) {
      throw boom.notFound('Factura no encontrado');
    }
    return purchInvoiceFound;
  }


  async create(data) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const newPurchInvoice = await purchInvoice.create(data, { transaction });

      // Preparar los datos para la primera línea vacía
      // Asegúrate de que estos valores por defecto sean aceptables por tu modelo purchInvoiceLine
      const emptyItemData = {
        codeInvoice: newPurchInvoice.code,
        lineNo: 1,
        codeItem: '',
        description: '',
        quantity: 0,
        unitMeasure: 'UNIDAD',
        quantityUnitMeasure: 0,
        unitPrice: 0.00,
        vat: 0.00,         // Asumiendo que existe un campo 'vat' en purchInvoiceLine
        amountLine: 0.00,  // Asumiendo que existe un campo 'amountLine' en purchInvoiceLine
        username: data.username || 'Sistema',
      };

      // Crea la primera línea vacía y vinculada dentro de la misma transacción
      await purchInvoiceLine.create(emptyItemData, { transaction });

      await transaction.commit(); // Si todo fue bien, confirma la transacción

      const fullBudget = await purchInvoice.findByPk(newPurchInvoice.code, {
        include: [{
          model: purchInvoiceLine,
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
      console.error('Error en purchInvoiceService.create (con transacción y primera línea): ', error);
      if (error.name === "SequelizeUniqueConstraintError") {
        throw boom.conflict(`El código de Factura '${data.code}' ya existe. Intenta otro.`);
      }
      throw boom.badImplementation('Error al crear el Factura y su primera línea', error);
    }
  }

  async update(code, changes) {
    console.log(`\n--- DEBUG: Dentro de purchInvoiceService.update(${code}, changes) ---`);
    console.log("Cambios recibidos (body):", JSON.stringify(changes, null, 2));

    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const purchInvoiceInstance = await purchInvoice.findOne({
        where: { code },
        transaction
      });

      if (!purchInvoiceInstance) {
        throw boom.notFound('Factura no encontrado');
      }

      await purchInvoiceInstance.update(headerChanges, { transaction });

      // Eliminar todas las líneas existentes para este Factura
      await purchInvoiceLine.destroy({
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

        await purchInvoiceLine.bulkCreate(linesToInsert, {
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

      const updatedPurchInvoiceWithLines = await this.findOne(code, { includeLines: true });

      console.log("Factura actualizado (con líneas):", JSON.stringify(updatedPurchInvoiceWithLines, null, 2));
      return updatedPurchInvoiceWithLines;

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

  async archiveInvoice(invoiceCode) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      // 1. Encontrar la factura original con sus líneas
      const invoice = await purchInvoice.findByPk(invoiceCode, {
        include: [{
          model: purchInvoiceLine,
          as: 'lines' // Asegúrate de que este alias coincide con tu modelo purchInvoice
        }],
        transaction: transaction
      });

      if (!invoice) {
        throw boom.notFound(`Factura de venta con código '${invoiceCode}' no encontrada.`);
      }

      // Validar el estado de la factura antes de archivarla
      if (invoice.status !== 'Pagada') {
        throw boom.badRequest('Solo se pueden archivar facturas en estado "Pagada".');
      }

      // 2. Obtener y actualizar el nuevo número de serie usando el servicio
      const seriesType = 'Fact_compra_regist';
      const seriesStart = invoice.codePosting;
      const newNumber = await this.seriesNumberService.updateLastUsedSerie(seriesType, seriesStart, transaction);
      console.log(`DEBUG: Serie de numeración actualizada a: ${newNumber}`);

      // 3. Asignar el nuevo número a la factura que estoy registrando (la histórica)
      const invoicePostData = invoice.toJSON();
      invoicePostData.code = newNumber; //Sobre-escribimos el código de la factura
      invoicePostData.preInvoice = invoiceCode;


      // 4. Copiar la cabecera al histórico
      const newInvoicePost = await purchpostInvoice.create(invoicePostData, { transaction });
      console.log(`DEBUG: Cabecera de factura histórica creada con código: ${newInvoicePost.code}`);

      // 5. Copiar las líneas al histórico
      if (invoice.lines && invoice.lines.length > 0) {
        const linesToCreate = invoice.lines.map(line => {
          const lineData = line.toJSON();

          lineData.code_invoice = newInvoicePost.code;
          return lineData;
        });
        await purchPostInvoiceLine.bulkCreate(linesToCreate, { transaction });
        console.log(`DEBUG: ${linesToCreate.length} líneas históricas creadas.`);
      }

      // 6. Eliminar la factura y sus líneas de las tablas originales
      await purchPostInvoiceLine.destroy({
        where: { codeInvoice: invoiceCode },
        transaction: transaction
      });

      // Luego la cabecera
      await purchInvoice.destroy({
        where: { code: invoiceCode },
        transaction: transaction
      });
      console.log(`DEBUG: Cabecera de factura original eliminada para código: ${invoiceCode}`);

      // 7. Confirmar la transacción
      await transaction.commit();
      console.log('DEBUG: Transacción de archivo completada exitosamente.');


      return {
        message: `${newNumber}`,
        postInvoice: newInvoicePost // Variable corregida
      };

    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error('Error al archivar factura de venta:', error);
      if (error.isBoom) {
        throw error; // Re-lanza errores boom personalizados
      }
      throw boom.badImplementation('Error interno al archivar la factura de venta.', error);
    }
  }

  async delete(code) {
    console.log(`\n--- DEBUG: Dentro de purchInvoiceService.delete(${code}) ---`);

    const purchInvoiceToDelete = await purchInvoice.findOne({
      where: { code }
    });

    if (!purchInvoiceToDelete) {
      throw boom.notFound(`Factura con código ${code} no encontrado para eliminar`);
    }

    await purchInvoiceToDelete.destroy();

    console.log(`Factura ${code} y sus líneas eliminadas correctamente (vía CASCADE).`);
    return { code, message: 'Eliminado correctamente' };
  }
}

module.exports = purchInvoiceService;
