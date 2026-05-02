const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { calculateDocumentTotals } = require('../libs/taxCalculation');

const {
  purchPostInvoice,
  purchPostInvoiceLine,
  DocumentTax // Tabla universal de impuestos compartida
} = sequelize.models;

class PurchPostInvoiceService {

  // 1. Busqueda paginada con filtros (Efecto Espejo)
  async findPaginated({ limit, offset, searchTerm, filter }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {}
    };

    // Filtros de búsqueda (Código, Nombre Proveedor o NIF)
    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { nif: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    // Filtro de vencimiento (Opcional, igual que en ventas)
    if (filter === 'overdue') {
      options.where.due_date = { [Op.lt]: new Date() };
      options.where.status = 'Abierto';
    }

    try {
      const { count, rows } = await purchPostInvoice.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar el histórico de compras', error);
    }
  }

  // 2. Obtener una factura específica (por ID o Código)
  async findOne(id, options = {}) {
    const { includeLines = false } = options;
    const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));

    const queryOptions = {
      where: isNumeric ? { id } : { code: id },
      include: [
        { model: DocumentTax, as: 'taxes' } // Los impuestos siempre se incluyen
      ]
    };

    if (includeLines) {
      queryOptions.include.push({
        model: purchPostInvoiceLine,
        as: 'lines'
      });
    }

    const record = await purchPostInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura de compra no encontrada');
    return record;
  }

  // 3. Registro en histórico (Inmutable)
  async create(data) {
    const { lines, ...headerData } = data;
    let transaction;

    try {
      transaction = await sequelize.transaction();

      // A. Re-calcular totales (Seguridad: No confiamos ciegamente en el total del Front)
      // Usamos el calculador indicando que el destino es 'purchpostinvoices'
      const totals = calculateDocumentTotals(lines, headerData.movementId, 'purchpostinvoices');

      // B. Creación de Cabecera
      const newPostInvoice = await purchPostInvoice.create({
        ...headerData,
        amountWithoutVAT: totals.headerTotals.amountWithoutVAT,
        amountVAT: totals.headerTotals.amountVAT,
        amountWithVAT: totals.headerTotals.amountWithVAT
      }, { transaction });

      // C. Inserción masiva de líneas procesadas
      if (totals.processedLines && totals.processedLines.length > 0) {
        const rows = totals.processedLines.map((line) => {
          const base = parseFloat(line.amountLine) || 0;
          const porcentajeIVA = parseFloat(line.vat) || 0;
          const importeConIVA = base + (base * (porcentajeIVA / 100));

          return {
            code_document: newPostInvoice.code,
            line_no: line.lineNo,
            item_code: line.codeItem || null,
            description: line.description || '',
            quantity: parseFloat(line.quantity) || 0,
            unit_measure: line.unitMeasure || 'UNIDAD',
            quantity_unit_measure: parseFloat(line.quantityUnitMeasure) || 1,
            unit_price: parseFloat(line.unitPrice) || 0,
            tax_type: line.taxType || 'IVA',
            vat: porcentajeIVA,
            amount_line: importeConIVA, // Guardamos con IVA incluido para visualización directa
            user_name: data.userName || null,
            created_at: new Date(),
            updated_at: new Date()
          };
        });

        await sequelize.getQueryInterface().bulkInsert(
          'purch_post_invoice_lines', // Asegúrate de que este nombre coincida con tu migración
          rows,
          { transaction }
        );
      }

      // D. Vinculación de Impuestos
      // Marcamos los impuestos temporales como definitivos asociados a 'purchpostinvoices'
      await DocumentTax.update(
        { codeDocument: 'purchpostinvoices' },
        {
          where: { movementId: newPostInvoice.movementId },
          transaction
        }
      );

      await transaction.commit();

      // Retornamos el registro completo para confirmación
      return await this.findOne(newPostInvoice.id, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  // 4. Contador (Dashboard)
  async countAll() {
    try {
      return await purchPostInvoice.count();
    } catch (error) {
      throw boom.badImplementation('Error al contar registros', error);
    }
  }
}

module.exports = PurchPostInvoiceService;
