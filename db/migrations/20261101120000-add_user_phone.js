'use strict';

/**
 * Teléfono del usuario de escritorio (users.phone), editable por el propio
 * usuario desde "Mi perfil" (PATCH /users/me). Opcional: los usuarios ya
 * existentes quedan sin teléfono. Comprobado antes de añadirla para que la
 * migración sea idempotente.
 */
module.exports = {
  up: async ({ context: queryInterface }) => {
    const { DataTypes } = require('sequelize');
    const table = await queryInterface.describeTable('users');
    if (!table.phone) {
      await queryInterface.addColumn('users', 'phone', {
        type: DataTypes.STRING(20),
        allowNull: true
      });
    }
  },

  down: async ({ context: queryInterface }) => {
    const table = await queryInterface.describeTable('users');
    if (table.phone) {
      await queryInterface.removeColumn('users', 'phone');
    }
  }
};
