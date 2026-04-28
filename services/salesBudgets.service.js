const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { calculateDocumentTotals } = require('../libs/taxCalculation');

// Extraemos los modelos correctamente del objeto sequelize
const {
  salesBudget,
  salesBudgetLine,
  DocumentTax, // <--- Nuevo modelo agregado
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
      include: ['customer'] // Agregamos relación con cliente para el listado
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

  // Ahora buscamos por el ID numérico (PK)
  async findOne(identifier, options = {}) {
    const { includeLines = false } = options;

    // Determinamos si el identificador es el ID numérico o el Código visual
    const isNumeric = !isNaN(identifier) && !isNaN(parseFloat(identifier));
    const whereCondition = isNumeric ? { id: identifier } : { code: identifier };

    const queryOptions = {
      where: whereCondition,
      include: [
        { model: Customer, as: 'customer' },

        {
          model: DocumentTax,
          as: 'taxes',
          required: false
        }
      ]
    };

    if (includeLines) {
      queryOptions.include.push({
        model: salesBudgetLine,
        as: 'lines',
        required: false
      });
    }

    const record = await salesBudget.findOne(queryOptions);

    if (!record) {
      throw boom.notFound('Registro no encontrado');
    }

    return record.get({ plain: true });
  }

  async findStatuses() {
    try {
      const attributes = salesBudget.getAttributes();
      if (attributes.status && attributes.status.values) {
        return attributes.status.values;
      }
      return ['Borrador', 'Enviado', 'Aprobado', 'Rechazado'];
    } catch (error) {
      console.error("Error en findStatuses:", error);
      throw boom.badImplementation('No se pudieron obtener los estados');
    }
  }

  /**
   * Busca presupuestos aprobados vinculados a un cliente específico.
   * Útil para el selector de presupuestos en la pantalla de facturación.
   */
  async findByCustomer(entityCode) {
    console.log("DEBUG: Buscando presupuestos para el cliente:", entityCode);
    if (!entityCode) {
      throw boom.badRequest('Se requiere el código del cliente');
    }

    try {
      const budgets = await salesBudget.findAll({
        where: {
          entityCode: entityCode,
          status: 'Aprobado' // Solo los que se pueden facturar
        },

        attributes: ['id', 'code', 'name'], // Solo enviamos lo necesario para el select
        order: [['created_at', 'DESC']]

      });

      return budgets;
    } catch (error) {
      throw boom.badImplementation('Error al consultar presupuestos por cliente', error);
    }
  }

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear cabecera (Genera UUID 'movementId' en el Hook)
      const newSalesBudget = await salesBudget.create(headerData, { transaction });

      // 2. Calcular todo usando la librería
      // La librería ahora procesa taxType (IVA, IRPF, etc.)
      const { processedLines, taxesToInsert, totals } = calculateDocumentTotals(
        lines || [],
        newSalesBudget.movementId,
        'budget'
      );

      // 3. Insertar Líneas
      if (processedLines.length > 0) {
        // El spread (...l) ya incluye el taxType procesado por la librería
        const finalLines = processedLines.map(l => ({
          ...l,
          codeDocument: newSalesBudget.code
        }));
        await salesBudgetLine.bulkCreate(finalLines, { transaction });
      } else {
        // Línea por defecto corregida con taxType
        await salesBudgetLine.create({
          codeDocument: newSalesBudget.code,
          lineNo: 1,
          description: 'Nueva línea',
          quantity: 1,
          unitPrice: 0,
          amountLine: 0,
          taxType: 'IVA' // Valor por defecto para líneas vacías
        }, { transaction });
      }

      // 4. Insertar Impuestos Desglosados (Ya vienen agrupados por tipo y % desde la lib)
      if (taxesToInsert.length > 0) {
        await DocumentTax.bulkCreate(taxesToInsert, { transaction });
      }

      // 5. Actualizar totales en cabecera
      await newSalesBudget.update(totals, { transaction });

      await transaction.commit();
      return await this.findOne(newSalesBudget.id, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update(id, changes) {
    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
      const instance = await salesBudget.findOne({
        where: isNumeric ? { id } : { code: id },
        transaction
      });

      if (!instance) throw boom.notFound('Registro no encontrado');

      const currentStatus = String(instance.status).trim();

      // --- REGLAS DE NEGOCIO ---
      if (currentStatus === 'Aprobado' || currentStatus === 'Rechazado') {
        const allowedFields = ['comments', 'username'];
        const isAttemptingForbidden = Object.keys(headerChanges).some(key => !allowedFields.includes(key));
        if (isAttemptingForbidden || lines) {
          throw boom.forbidden(`En estado ${currentStatus} solo se pueden modificar comentarios`);
        }
      }

      if (currentStatus === 'Enviado') {
        if (headerChanges.entityCode && headerChanges.entityCode !== instance.entityCode) {
          throw boom.forbidden('No se puede cambiar el cliente de una oferta enviada');
        }
        if (headerChanges.status === 'Borrador') {
          throw boom.forbidden('No se puede volver a Borrador una oferta enviada');
        }
      }

      // --- PROCESAMIENTO DE LÓGICA Y CÁLCULOS ---
      let totalsUpdate = {};

      if (lines) {
        const { processedLines, taxesToInsert, totals } = calculateDocumentTotals(
          lines,
          instance.movementId,
          'budget'
        );

        totalsUpdate = totals;

        // Sincronizar Líneas
        await salesBudgetLine.destroy({ where: { codeDocument: instance.code }, transaction });

        const finalLines = processedLines.map(l => ({
          ...l, // Aquí ya viaja el taxType (IVA/IRPF)
          codeDocument: instance.code,
          username: headerChanges.username || instance.username || 'system'
        }));
        await salesBudgetLine.bulkCreate(finalLines, { transaction });

        // Sincronizar Impuestos
        await DocumentTax.destroy({
          where: { movementId: instance.movementId, codeDocument: 'budget' },
          transaction
        });
        await DocumentTax.bulkCreate(taxesToInsert, { transaction });
      }

      // --- ACTUALIZACIÓN FINAL ---
      const cleanHeader = { ...headerChanges, ...totalsUpdate };
      delete cleanHeader.id;
      delete cleanHeader.movementId;
      delete cleanHeader.code;

      await instance.update(cleanHeader, { transaction });

      await transaction.commit();
      return await this.findOne(instance.id, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete(id) {
    // 1. Búsqueda inteligente para evitar error de tipos en Postgres
    const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
    const record = await salesBudget.findOne({
      where: isNumeric ? { id } : { code: id },
      attributes: ['id', 'status', 'movementId', 'code']
    });

    if (!record) {
      throw boom.notFound('Registro no encontrado');
    }

    // 2. Validación de estado
    if (String(record.status).trim() !== 'Borrador') {
      throw boom.forbidden(`No se puede eliminar una oferta en estado ${record.status}`);
    }

    // 3. Eliminación
    // El Hook afterDestroy en el modelo se encargará de borrar los DocumentTax por movementId
    // Las líneas deben borrarse aquí o vía ON DELETE CASCADE en la DB
    const transaction = await sequelize.transaction();
    try {
      // Borramos líneas explícitamente si no tienes CASCADE en la DB
      await salesBudgetLine.destroy({ where: { codeDocument: record.code }, transaction });

      await record.destroy({ transaction });

      await transaction.commit();
      return { id, code: record.code, deleted: true };
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }
}

module.exports = salesBudgetService;
