const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const SALESBUDGET_TABLE = 'sales_budgets';

const salesBudgetSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
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
  username: {
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
          if (instance.isNewRecord && !instance.code) {
            await generateNextCode(instance, options);
          }
        }
      }
    };
  }
}

module.exports = { salesBudget, salesBudgetSchema, SALESBUDGET_TABLE };
