'use strict';

const { PURCHINVOICE_TABLE } = require('../models/purchInvoice.model'); // Ajusta la ruta a tus modelos
const { PURCHPOSTINVOICE_TABLE } = require('../models/purchPostInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Definición del campo para las migraciones
    const categoryField = {
      type: Sequelize.ENUM(
        'Materiales',
        'Subcontratas',
        'Personal y Nóminas',
        'Herramientas y Alquileres',
        'Vehículos y Movilidad',
        'Gastos de Oficina y Varios'
      ),
      allowNull: true,
      defaultValue: 'Gastos de Oficina y Varios'
    };

    // Añadir a la tabla de facturas activas
    await queryInterface.addColumn(PURCHINVOICE_TABLE, 'category', categoryField);

    // Añadir a la tabla de facturas históricas
    await queryInterface.addColumn(PURCHPOSTINVOICE_TABLE, 'category', categoryField);
  },

  down: async (queryInterface) => {
    // Eliminar la columna de ambas tablas si se hace un rollback
    await queryInterface.removeColumn(PURCHINVOICE_TABLE, 'category');
    await queryInterface.removeColumn(PURCHPOSTINVOICE_TABLE, 'category');

    // Opcional: Eliminar el tipo ENUM de la base de datos (solo en PostgreSQL)
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_category";');
  }
};
