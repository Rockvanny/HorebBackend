const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const PRODUCT_TABLE = 'products';

const ProductSchema = {
  // Cambiamos a primaryKey simple sin autoIncrement porque es STRING
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },

  // Campo Virtual para recibir la serie desde el frontend sin guardarla en DB
  selectedSerie: {
    type: DataTypes.VIRTUAL
  },

  name: {
    field: 'name',
    type: DataTypes.STRING,
    allowNull: false,
  },

  unitMeasure: {
    type: DataTypes.ENUM('Unidad','Caja','Kilos','Metros', 'Horas'),
    allowNull: false,
    defaultValue: 'Unidad'
  },

  qtyByUnitMeasure: {
    field: 'qty_by_unit_measure',
    type: DataTypes.DECIMAL(10, 2), // Añadida precisión para evitar errores de redondeo
    allowNull: false
  },

  price: {
    field: 'price',
    type: DataTypes.DECIMAL(10, 2), // Añadida precisión
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

  static associate(models) {
    // Aquí irán las asociaciones (ej: con categorías o líneas de factura)
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PRODUCT_TABLE,
      modelName: 'Products',
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleteAt',
      hooks: {
        beforeValidate: async (instance, options) => {
          // 1. ASIGNACIÓN DE USUARIO (Si se pasa en las opciones del Service)
          if (options.user) {
            instance.username = options.user;
          }

          // 2. GENERACIÓN DE CÓDIGO (Solo para nuevos registros)
          if (instance.isNewRecord) {
            // Verificamos que el VIRTUAL 'selectedSerie' traiga valor
            if (!instance.selectedSerie) {
              throw new Error("Se requiere 'selectedSerie' para generar el código del producto.");
            }
            // Llamamos a tu lógica global de secuencias
            await generateNextCode(instance, options);
          }
        }
      }
    }
  }
}

module.exports = { Products, ProductSchema, PRODUCT_TABLE };
