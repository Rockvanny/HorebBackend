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
        model: salesBudgetLine,
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

  async findStatuses() {
    try {
      // USAMOS 'salesBudget', que es la constante que definiste arriba vía sequelize.models
      const attributes = salesBudget.getAttributes();

      if (attributes.status && attributes.status.values) {
        return attributes.status.values;
      }

      // Fallback por si acaso el ENUM no se lee correctamente
      return ['Borrador', 'Enviado', 'Aprobado', 'Rechazado'];
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
      // 1. Obtener el estado actual de la DB
      const instance = await salesBudget.findOne({ where: { code }, transaction });
      if (!instance) throw boom.notFound('Registro no encontrado');

      const currentStatus = instance.status;

      // --- REGLA 1: ESTADOS FINALES (Aprobado / Rechazado) ---
      if (currentStatus === 'Aprobado' || currentStatus === 'Rechazado') {
        // En estos estados, SOLO se permite modificar el campo 'comments'
        const allowedFields = ['comments', 'username']; // username suele enviarse siempre
        const keysAttempted = Object.keys(headerChanges);
        const isAttemptingOtherFields = keysAttempted.some(key => !allowedFields.includes(key));

        if (isAttemptingOtherFields || lines) {
          throw boom.forbidden(`En estado ${currentStatus} solo se pueden modificar las observaciones`);
        }
      }

      // --- REGLA 2: ESTADO ENVIADO ---
      if (currentStatus === 'Enviado') {
        // No se puede cambiar el cliente (entityCode)
        if (headerChanges.entityCode && headerChanges.entityCode !== instance.entityCode) {
          throw boom.forbidden('No se puede cambiar el cliente de una oferta ya enviada');
        }

        // Bloquear cambio de estado a 'Borrador'
        if (headerChanges.status === 'Borrador') {
          throw boom.forbidden('No se puede volver a Borrador una oferta ya enviada');
        }
      }

      // --- LIMPIEZA DE DATOS ---
      const cleanHeader = { ...headerChanges };
      delete cleanHeader.id;
      delete cleanHeader.code;
      delete cleanHeader.createdAt;
      delete cleanHeader.updatedAt;

      // 2. Actualizar cabecera
      await instance.update(cleanHeader, { transaction });

      // 3. Sincronizar líneas (Solo si el estado permite modificar líneas)
      // (Si es Aprobado/Rechazado, el check de arriba ya habrá lanzado error si 'lines' existe)
      if (lines) {
        await salesBudgetLine.destroy({ where: { codeDocument: code }, transaction });

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
          await salesBudgetLine.bulkCreate(linesToInsert, { transaction });
        }
        // Nota: No creamos línea por defecto aquí si el usuario envía array vacío
        // para evitar sobrescribir si no es necesario.
      }

      await transaction.commit();
      return await this.findOne(code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete(code) {
    // 1. Buscamos solo el campo status directamente de la DB, sin basura en memoria
    const record = await salesBudget.findByPk(code, {
      attributes: ['status']
    });

    if (!record) {
      throw boom.notFound('Registro no encontrado');
    }

    // 2. Validación ultra-estricta (Case Sensitive y Trim)
    const currentStatus = record.status;

    if (String(currentStatus).trim() !== 'Borrador') {
      throw boom.forbidden(`Seguridad: No se puede eliminar una oferta en estado ${currentStatus}. Solo se admiten registros en 'Borrador'.`);
    }

    // 3. Eliminación física
    return await salesBudget.destroy({
      where: {
        code: code,
        status: 'Borrador' // Doble seguro: Si el estado cambió justo ahora, el where fallará
      }
    });
  }
}

module.exports = salesBudgetService;
