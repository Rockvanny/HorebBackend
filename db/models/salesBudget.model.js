const { Model, DataTypes, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { generateNextCode } = require('../../libs/sequence.handler');

const SALESBUDGET_TABLE = 'sales_budgets';

const salesBudgetSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  // NUEVO: El "ADN" único del documento para relacionar impuestos
  movementId: {
    field: 'movement_id',
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    defaultValue: DataTypes.UUIDV4 // También lo definimos a nivel de esquema por seguridad
  },
  code: {
    field: 'code',
    allowNull: false,
    unique: true,
    type: DataTypes.STRING
  },
  postingDate: {
    field: 'posting_date',
    type: DataTypes.DATE,
  },
  dueDate: {
    field: 'due_date',
    type: DataTypes.DATE,
  },
  entityCode: {
    field: 'entity_code',
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    field: 'name',
    type: DataTypes.STRING
  },
  nif: {
    field: 'nif',
    type: DataTypes.STRING
  },
  email: {
    field: 'email',
    type: DataTypes.STRING
  },
  phone: {
    field: 'phone',
    type: DataTypes.STRING
  },
  address: {
    field: 'address',
    type: DataTypes.STRING
  },
  postCode: {
    field: 'post_code',
    type: DataTypes.STRING
  },
  city: {
    field: 'city',
    type: DataTypes.STRING
  },
  status: {
    field: 'status',
    type: DataTypes.ENUM('Borrador', 'Enviado', 'Aprobado', 'Rechazado'),
    allowNull: false,
    defaultValue: 'Borrador'
  },
  paymentMethod: {
    field: 'payment_method',
    type: Sequelize.DataTypes.ENUM(
      'Transferencia',
      'Efectivo',
      'Tarjeta',
      'Bizum',
    ),
    allowNull: false,
    defaultValue: 'Transferencia'
  },
  amountWithoutVAT: {
    field: 'amount_without_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  comments: {
    field: 'comments',
    type: DataTypes.TEXT
  },
  userName: {
    field: 'user_name',
    type: DataTypes.STRING,
  },
  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
};

class salesBudget extends Model {
  static associate(models) {
    this.belongsTo(models.Customer, {
      as: 'customer',
      foreignKey: 'entity_code'
    });

    this.hasMany(models.salesBudgetLine, {
      as: 'lines',
      foreignKey: 'codeDocument',
      sourceKey: 'code',
      onDelete: 'CASCADE',
      hooks: true
    });

    // RELACIÓN ACTUALIZADA: Ahora vinculamos por movementId (UUID)
    this.hasMany(models.DocumentTax, {
      as: 'taxes',
      foreignKey: 'movementId', // document_taxes.movement_id
      sourceKey: 'movementId',  // sales_budgets.movement_id
      constraints: false,
      scope: {
        codeDocument: 'budget'
      }
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESBUDGET_TABLE,
      modelName: 'salesBudget',
      timestamps: false,
      underscored: true,
      hooks: {
        beforeValidate: async (instance, options) => {
          // 1. Generar código visual correlativo
          if (instance.isNewRecord && !instance.code) {
            await generateNextCode(instance, options);
          }
          // 2. Generar UUID de movimiento si no existe
          if (instance.isNewRecord && !instance.movementId) {
            instance.movementId = uuidv4();
          }
        },

        // Hook de limpieza actualizado para usar movementId
        afterDestroy: async (instance, options) => {
          await sequelize.models.DocumentTax.destroy({
            where: {
              movementId: instance.movementId,
              codeDocument: 'budget'
            },
            transaction: options.transaction
          });
        }
      }
    };
  }
}

module.exports = { salesBudget, salesBudgetSchema, SALESBUDGET_TABLE };
