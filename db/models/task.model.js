const { Model, DataTypes, Sequelize } = require('sequelize');

const TASK_TABLE = 'tasks';

// Dos tipos de tarea (ver AndroidApp/ui/tasks/TasksScreen.kt): ADMINISTRATIVA
// (ej. enviar factura, llamar proveedor) y OPERATIVA_CAMPO (trabajo físico en
// una dirección, ej. tumbar un muro, poner baldosas) -por eso los campos de
// ubicación son opcionales a nivel de BD, solo tienen sentido para esta
// segunda-. Sin ENUM de Postgres para type/status/priority a propósito (como
// status en salesInvoice/incident_reports): un string simple es más fácil de
// ampliar más adelante sin migración de tipo.
const TASK_TYPES = ['ADMINISTRATIVA', 'OPERATIVA_CAMPO'];
const TASK_STATUSES = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'];
const TASK_PRIORITIES = ['BAJA', 'MEDIA', 'ALTA'];

const TaskSchema = {
  id: {
    field: 'id',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4
  },

  title: {
    field: 'title',
    allowNull: false,
    type: DataTypes.STRING,
  },

  description: {
    field: 'description',
    allowNull: false,
    type: DataTypes.TEXT,
  },

  type: {
    field: 'type',
    allowNull: false,
    type: DataTypes.STRING,
  },

  status: {
    field: 'status',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'PENDIENTE'
  },

  priority: {
    field: 'priority',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'MEDIA'
  },

  dueDate: {
    field: 'due_date',
    allowNull: true,
    type: DataTypes.DATE,
  },

  // FK real a users.code: si se intenta borrar un usuario con tareas
  // asignadas, se bloquea (RESTRICT, ver migración) en vez de perder el
  // historial de tareas silenciosamente.
  assignedTo: {
    field: 'assigned_to',
    allowNull: false,
    type: DataTypes.STRING,
  },

  // FK "blanda" a users.code (mismo patrón que notification.recipientUser /
  // operatingExpenses.userName): solo para auditoría de quién la creó, sin
  // constraint -no debe bloquear nada si ese usuario deja de existir-.
  createdBy: {
    field: 'created_by',
    allowNull: false,
    type: DataTypes.STRING,
  },

  // Ubicación: opcional también a nivel de BD -la tabla es flexible a
  // propósito, ver comentario de arriba-, solo se rellena para OPERATIVA_CAMPO.
  address: {
    field: 'address',
    allowNull: true,
    type: DataTypes.STRING,
  },

  postCode: {
    field: 'post_code',
    allowNull: true,
    type: DataTypes.STRING,
  },

  city: {
    field: 'city',
    allowNull: true,
    type: DataTypes.STRING,
  },

  // Edificio concreto al que se refiere la tarea (opcional, solo tiene
  // sentido para OPERATIVA_CAMPO cuando existe un contrato de mantenimiento
  // de por medio, ver building.model.js). No sustituye a address/city -una
  // tarea de campo puede seguir siendo una dirección suelta sin edificio
  // asociado-, son complementarios: si se rellena, la app puede mostrar
  // también los datos del contrato/administrador del edificio.
  buildingId: {
    field: 'building_id',
    allowNull: true,
    type: DataTypes.UUID,
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

class Task extends Model {
  static associate(models) {
    this.belongsTo(models.User, { as: 'assignee', foreignKey: 'assignedTo', targetKey: 'code' });
    this.belongsTo(models.Building, { as: 'building', foreignKey: 'buildingId', targetKey: 'id' });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: TASK_TABLE,
      modelName: 'Task',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { Task, TaskSchema, TASK_TABLE, TASK_TYPES, TASK_STATUSES, TASK_PRIORITIES };
