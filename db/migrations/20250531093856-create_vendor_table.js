'use strict';
const { VENDOR_TABLE } = require('./../models/vendor.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(VENDOR_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      // Cambiamos allowNull a false para coincidir con el modelo Customer y la nueva lógica
      name: {
        field: 'name',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      nif: {
        field: 'nif',
        allowNull: false, // El schema de Joi ahora lo requiere
        type: Sequelize.DataTypes.STRING,
      },
      email: {
        field: 'email',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      phone: {
        field: 'phone',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      address: {
        field: 'address',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      postCode: {
        field: 'post_code',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      city: {
        field: 'city',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      category: {
        field: 'category',
        type: Sequelize.DataTypes.ENUM(
          'Materiales',
          'Subcontratas',
          'Personal y Nóminas',
          'Herramientas y Alquileres',
          'Vehículos y Movilidad',
          'Gastos de Oficina y Varios'
        ),
        allowNull: false, // Cambiado a false para obligar integridad
        defaultValue: 'Gastos de Oficina y Varios'
      },
      username: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
      },
      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        field: 'updated_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleteAt: {
        field: 'delete_at',
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
        defaultValue: null
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(VENDOR_TABLE);
    // IMPORTANTE: Si usas PostgreSQL, a veces es necesario eliminar el ENUM manualmente
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vendors_category";');
  }
};
