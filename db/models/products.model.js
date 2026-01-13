const { Model, DataTypes, Sequelize } = require('sequelize');

const PRODUCT_TABLE = 'products';

const ProductSchema = {
  code: {
    field: 'code',
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.STRING
  },

  name: {
    field: 'name',
    type: DataTypes.STRING,
    allowNull: false,
  },

  unitMeasure: {
    field: 'unit_measure',
    type: DataTypes.STRING,
    allowNull: false,
  },

  qtyByUnitMeasure: {
    field: 'qty_by_unit_measure',
    type: DataTypes.DECIMAL,
    allowNull: false
  },

  price: {
    field: 'price',
    type: DataTypes.DECIMAL,
    allowNull: false,
  },

  vat: {
    field: 'vat',
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  username: {
    field: 'user_name',
    type: DataTypes.STRING,
  },

  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE
  },

  deleteAt: {
    field: 'delete_at',
    allowNull: true,
    type: DataTypes.DATE
  }
}

class Products extends Model {

  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PRODUCT_TABLE,
      modelName: 'Products',
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleteAt'
    }
  }
}

module.exports = { Products, ProductSchema, PRODUCT_TABLE };
