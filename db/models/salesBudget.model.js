const { Model, DataTypes, Sequelize } = require('sequelize');

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

  customerCode: {
    field: 'customer_code',
    type: DataTypes.STRING,
  },
  
  name: {
    field: 'name',
    type: DataTypes.STRING,
  },

  email: {
    field: 'email',
    type: DataTypes.STRING,
  },

  phone: {
    field: 'phone',
    type: DataTypes.STRING,
  },

  address: {
    field: 'address',
    type: DataTypes.STRING,
  },

  postCode: {
    field: 'post_code',
    type: DataTypes.STRING,
  },

  city: {
    field: 'city',
    type: DataTypes.STRING,
  },

  status: {
    field: 'status',
    type: DataTypes.STRING,
  },

  amountWithoutVAT: {
    field: 'amount_Without_vat',
    type: DataTypes.DECIMAL(10, 2),
  },

  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(10, 2),
  },

  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(10, 2),
  },

  username: {
    field: 'user_name',
    type: DataTypes.STRING,
  },

  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE
  }
}

class salesBudget extends Model {

  static associate(models) {
    // Una factura compra pertenece a un proveedor
    this.belongsTo(models.Customer, {
      as: 'customer',
      foreignKey: 'customer_code'
    });

    this.hasMany(models.salesBudgetLine, {
      as: 'lines',  // Un alias para acceder a las líneas (ej. offer.lines)
      foreignKey: 'codeBudget' // La clave foránea en la tabla salesBudgetLines
    })
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESBUDGET_TABLE,
      modelName: 'salesBudget',
      timestamps: true,
      underscored: true
    }
  }
}

module.exports = { salesBudget, salesBudgetSchema, SALESBUDGET_TABLE };
