const { Model, DataTypes, Sequelize } = require('sequelize');

const CUSTOMER_BUILDING_TABLE = 'customer_buildings';

// Tabla puente N:M cliente<->edificio (decidido con el usuario 2026-09-19:
// un cliente puede estar en varios edificios -ej. propietario en 2
// comunidades-, así que hacía falta esta tabla y no un campo buildingId
// suelto en Customer). Se da de alta solo desde admin (Backend/Frontend),
// nunca desde el móvil -el cliente solo la CONSULTA al reportar una
// incidencia, ver routes/customerBuildings.router.js#/mine-.
const CUSTOMER_BUILDING_RELATIONSHIP_TYPES = ['PROPIETARIO', 'INQUILINO', 'PRESIDENTE_COMUNIDAD'];

const CustomerBuildingSchema = {
  id: {
    field: 'id',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4
  },

  customerCode: {
    field: 'customer_code',
    allowNull: false,
    type: DataTypes.STRING,
  },

  buildingId: {
    field: 'building_id',
    allowNull: false,
    type: DataTypes.UUID,
  },

  // Vivienda/local concreto dentro del edificio (ej. "3ºB", "Local 2") -clave
  // para saber a qué unidad afecta una incidencia cuando el edificio tiene
  // muchos clientes-.
  unitNumber: {
    field: 'unit_number',
    allowNull: true,
    type: DataTypes.STRING,
  },

  relationshipType: {
    field: 'relationship_type',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'PROPIETARIO'
  },

  // Baja lógica: si un cliente se muda, se marca false en vez de borrar la
  // fila, para no perder el histórico de quién vivió dónde.
  isActive: {
    field: 'is_active',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
};

class CustomerBuilding extends Model {
  static associate(models) {
    this.belongsTo(models.Customer, {
      as: 'customer',
      foreignKey: 'customerCode',
      targetKey: 'code'
    });

    this.belongsTo(models.Building, {
      as: 'building',
      foreignKey: 'buildingId',
      targetKey: 'id'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: CUSTOMER_BUILDING_TABLE,
      modelName: 'CustomerBuilding',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { CustomerBuilding, CustomerBuildingSchema, CUSTOMER_BUILDING_TABLE, CUSTOMER_BUILDING_RELATIONSHIP_TYPES };
