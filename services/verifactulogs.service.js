const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const generateVerifactuHash = require('../libs/hasInvoice');

const { VerifactuLog, salesPostInvoice } = sequelize.models;

class VerifactuService {
  constructor() {}

  async createLog(invoiceCode, isTest = false, transaction = null) {
    // Si no viene transacción, creamos una, si viene, usamos la del padre
    const t = transaction || await sequelize.transaction();

    try {
      const invoice = await salesPostInvoice.findOne({
        where: { code: invoiceCode },
        transaction: t
      });

      if (!invoice) throw boom.notFound('Factura no encontrada para registro Veri*factu');

      // Obtenemos el último log para encadenar la huella
      const lastLog = await VerifactuLog.findOne({
        order: [['id', 'DESC']],
        transaction: t
      });

      const prevFingerprint = lastLog ? lastLog.fingerprint : null;

      // Generamos la huella digital usando tu librería en /libs
      const fingerprint = generateVerifactuHash(invoice, prevFingerprint);

      // Preparamos el Payload que se usará para el envío futuro
      const payload = {
        emisor: { nif: invoice.nif, nombre: invoice.name },
        factura: {
          numero: invoice.code,
          fecha: invoice.postingDate,
          tipo: invoice.typeInvoice || 'F1', // F1 es el estándar para facturas ordinarias
          total: parseFloat(invoice.amountWithVAT).toFixed(2),
          cuota_iva: parseFloat(invoice.amountVAT).toFixed(2)
        },
        timestamp: new Date().toISOString(),
        test: isTest
      };

      // Guardamos el registro de trazabilidad
      const newLog = await VerifactuLog.create({
        invoiceCode: invoice.code,
        fingerprint,
        prevFingerprint,
        payload,
        isTest
      }, { transaction: t });

      // Solo hacemos commit si la transacción se inició en este servicio
      if (!transaction) await t.commit();

      return newLog;

    } catch (error) {
      // Solo hacemos rollback si la transacción se inició aquí
      if (!transaction && t) await t.rollback();

      // Propagamos el error para que el servicio padre también se entere
      throw error.isBoom ? error : boom.badImplementation(error);
    }
  }

  // ... (findOne, findPaginated, etc)
}

module.exports = VerifactuService;
