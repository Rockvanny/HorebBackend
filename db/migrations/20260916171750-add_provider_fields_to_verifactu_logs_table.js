'use strict';
const { DataTypes } = require('sequelize');
const { VERIFACTU_LOG_TABLE } = require('../models/verifactuLogs.model');

/**
 * Deja preparada la tabla verifactu_logs para un futuro envío a un
 * proveedor Veri*factu externo (hoy no implementado: activar "Usar
 * proveedor externo" en Configuración Veri*factu no dispara ninguna llamada
 * real todavía, ver services/salesPostInvoice.service.js). El objetivo es
 * que, cuando se integre un proveedor concreto, baste con llamar a
 * VerifactuService#applyProviderResponse() para volcar su respuesta aquí,
 * sin tener que volver a tocar el esquema.
 */
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn(VERIFACTU_LOG_TABLE, 'status', {
      type: DataTypes.ENUM('pending', 'sent', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });

    await queryInterface.addColumn(VERIFACTU_LOG_TABLE, 'provider_response', {
      type: DataTypes.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn(VERIFACTU_LOG_TABLE, 'provider_error', {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn(VERIFACTU_LOG_TABLE, 'submitted_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    // Backfill: para los registros ya existentes (todos generados en modo
    // local hasta ahora) se infiere el estado a partir de lo único que ya
    // sabíamos de ellos.
    await queryInterface.sequelize.query(`
      UPDATE ${VERIFACTU_LOG_TABLE}
      SET status = (CASE
        WHEN external_reference IS NOT NULL THEN 'accepted'
        WHEN exported_at IS NOT NULL THEN 'sent'
        ELSE 'pending'
      END)::"enum_${VERIFACTU_LOG_TABLE}_status"
    `);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn(VERIFACTU_LOG_TABLE, 'submitted_at');
    await queryInterface.removeColumn(VERIFACTU_LOG_TABLE, 'provider_error');
    await queryInterface.removeColumn(VERIFACTU_LOG_TABLE, 'provider_response');
    await queryInterface.removeColumn(VERIFACTU_LOG_TABLE, 'status');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_${VERIFACTU_LOG_TABLE}_status";`);
  }
};
