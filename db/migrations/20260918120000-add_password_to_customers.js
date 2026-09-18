'use strict';
const { DataTypes } = require('sequelize');

// Habilita el autoservicio de clientes (app móvil): un cliente puede darse de
// alta poniendo una contraseña sobre su propia fila ya existente en
// 'customers' (verificado por NIF+email, ver customers.service.js#registerAccount).
// Nullable: todos los clientes ya creados por el personal interno no tienen
// contraseña hasta que se registran ellos mismos.
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('customers', 'password', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('customers', 'password');
  }
};
