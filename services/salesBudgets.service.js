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
        const { includeLines = false, includeCustomer = false } = options;
        const queryOptions = { include: [] };

        if (includeCustomer) {
            queryOptions.include.push({ model: Customer, as: 'customer' });
        }

        if (includeLines) {
            queryOptions.include.push({
                model: salesBudgetLine,
                as: 'lines'
            });
        }

        const salesBudgetFound = await salesBudget.findByPk(code, queryOptions);
        if (!salesBudgetFound) {
            throw boom.notFound('Registro no encontrado');
        }
        return salesBudgetFound;
    }

    async create(data) {
        const { lines, ...headerData } = data;
        const transaction = await sequelize.transaction();

        try {
            // 1. Crear cabecera (El hook beforeValidate genera el 'code')
            const newSalesBudget = await salesBudget.create(headerData, { transaction });

            // 2. Procesar líneas
            if (lines && lines.length > 0) {
                const linesToInsert = lines.map((line, index) => ({
                    // Propagamos datos de la línea y aseguramos tipos
                    lineNo: line.lineNo || (index + 1),
                    codeDocument: newSalesBudget.code, // Vinculación con la cabecera
                    codeItem: line.codeItem || null,
                    description: line.description || 'Sin descripción',
                    quantity: parseFloat(line.quantity) || 0,
                    unitMeasure: line.unitMeasure || 'UNIDAD',
                    quantityUnitMeasure: parseFloat(line.quantityUnitMeasure) || 1,
                    unitPrice: parseFloat(line.unitPrice) || 0,
                    vat: parseFloat(line.vat) || 0,
                    amountLine: parseFloat(line.amountLine) || 0,
                    username: data.username || 'system'
                }));

                try {
                    // Usamos el modelo extraído al inicio: salesBudgetLine
                    await salesBudgetLine.bulkCreate(linesToInsert, { transaction });
                } catch (dbError) {
                    // Log detallado para capturar errores de constraints de Postgres
                    console.error("DETALLE ERROR DB EN LINEAS:", dbError.parent || dbError);
                    throw dbError;
                }
            } else {
                // 3. Línea por defecto si no hay líneas
                const emptyLine = {
                    codeDocument: newSalesBudget.code,
                    lineNo: 1,
                    description: 'Nueva línea',
                    quantity: 1.0,
                    unitPrice: 0.0,
                    vat: 0.0,
                    amountLine: 0.0,
                    username: data.username || 'Sistema'
                };
                await salesBudgetLine.create(emptyLine, { transaction });
            }

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

            await instance.update(headerChanges, { transaction });

            if (lines) {
                // Sincronización: Borrar y volver a crear
                await salesBudgetLine.destroy({
                    where: { codeDocument: code },
                    transaction
                });

                if (lines.length > 0) {
                    const linesToInsert = lines.map((line, index) => ({
                        ...line,
                        codeDocument: code,
                        lineNo: line.lineNo || (index + 1)
                    }));
                    await salesBudgetLine.bulkCreate(linesToInsert, { transaction });
                }
            }

            await transaction.commit();
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
