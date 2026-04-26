const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

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
  async findOne(id, options = {}) {
    const { includeLines = false } = options;

    const queryOptions = {
      where: { id }, // <--- Cambiado de code a id
      include: [
        { model: Customer, as: 'customer' },
        {
          model: DocumentTax,
          as: 'taxes',
          where: { codeDocument: 'budget' }, // Solo impuestos de este presupuesto
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

  async create(data) {
    const { lines, taxes, ...headerData } = data; // <--- Capturamos 'taxes' del body
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear cabecera (Genera code y movementId via Hook beforeValidate)
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
        await salesBudgetLine.create({
          codeDocument: newSalesBudget.code,
          lineNo: 1,
          description: 'Nueva línea',
          quantity: 1,
          unitPrice: 0,
          amountLine: 0
        }, { transaction });
      }

      // 3. Procesar Impuestos (VINCULADOS POR movementId)
      if (taxes && taxes.length > 0) {
        const taxesToInsert = taxes.map(tax => ({
          ...tax,
          movementId: newSalesBudget.movementId, // ADN generado en el paso 1
          codeDocument: 'budget'
        }));
        await DocumentTax.bulkCreate(taxesToInsert, { transaction });
      }

      // 4. ACTUALIZAR TOTALES EN CABECERA
      await newSalesBudget.update({
        amountWithoutVAT: totalNeto,
        amountVAT: totalIva,
        amountWithVAT: totalNeto + totalIva
      }, { transaction });

      await transaction.commit();
      return await this.findOne(newSalesBudget.id, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update(id, changes) {
    const { lines, taxes, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      // 1. Obtener el estado actual por ID
      const instance = await salesBudget.findByPk(id, { transaction });
      if (!instance) throw boom.notFound('Registro no encontrado');

      const currentStatus = instance.status;

      // --- REGLA 1: ESTADOS FINALES ---
      if (currentStatus === 'Aprobado' || currentStatus === 'Rechazado') {
        const allowedFields = ['comments', 'username'];
        const keysAttempted = Object.keys(headerChanges);
        const isAttemptingOtherFields = keysAttempted.some(key => !allowedFields.includes(key));

        if (isAttemptingOtherFields || lines || taxes) {
          throw boom.forbidden(`En estado ${currentStatus} solo se pueden modificar las observaciones`);
        }
      }

      // --- REGLA 2: ESTADO ENVIADO ---
      if (currentStatus === 'Enviado') {
        if (headerChanges.entityCode && headerChanges.entityCode !== instance.entityCode) {
          throw boom.forbidden('No se puede cambiar el cliente de una oferta ya enviada');
        }
        if (headerChanges.status === 'Borrador') {
          throw boom.forbidden('No se puede volver a Borrador una oferta ya enviada');
        }
      }

      // --- LIMPIEZA DE DATOS ---
      const cleanHeader = { ...headerChanges };
      delete cleanHeader.id;
      delete cleanHeader.movementId; // Protegemos el ADN
      delete cleanHeader.code;
      delete cleanHeader.createdAt;
      delete cleanHeader.updatedAt;

      // 2. Actualizar cabecera
      await instance.update(cleanHeader, { transaction });

      // 3. Sincronizar líneas
      if (lines) {
        await salesBudgetLine.destroy({ where: { codeDocument: instance.code }, transaction });
        if (lines.length > 0) {
          const linesToInsert = lines.map((line, index) => {
            const { id: lineId, ...lineData } = line;
            return {
              ...lineData,
              codeDocument: instance.code,
              lineNo: line.lineNo || (index + 1),
              username: line.username || cleanHeader.username || 'system'
            };
          });
          await salesBudgetLine.bulkCreate(linesToInsert, { transaction });
        }
      }

      // 4. Sincronizar Impuestos (UUID se mantiene constante)
      if (taxes) {
        await DocumentTax.destroy({
          where: { movementId: instance.movementId, codeDocument: 'budget' },
          transaction
        });
        if (taxes.length > 0) {
          const taxesToInsert = taxes.map(tax => ({
            ...tax,
            movementId: instance.movementId,
            codeDocument: 'budget'
          }));
          await DocumentTax.bulkCreate(taxesToInsert, { transaction });
        }
      }

      await transaction.commit();
      return await this.findOne(id, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete(id) {
    const record = await salesBudget.findByPk(id, {
      attributes: ['id', 'status', 'movementId']
    });

    if (!record) {
      throw boom.notFound('Registro no encontrado');
    }

    if (String(record.status).trim() !== 'Borrador') {
      throw boom.forbidden(`No se puede eliminar una oferta en estado ${record.status}`);
    }

    // La eliminación de DocumentTax se hará automáticamente vía el Hook afterDestroy
    // que definimos en el modelo salesBudget.
    return await salesBudget.destroy({
      where: {
        id: id,
        status: 'Borrador'
      }
    });
  }
}

module.exports = salesBudgetService;
