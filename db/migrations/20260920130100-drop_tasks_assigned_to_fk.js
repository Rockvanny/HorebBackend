'use strict';
const { TASK_TABLE } = require('../models/task.model');

/**
 * Task.assignedTo tenía una FK física a users.code (Users = flujo de
 * escritorio). Con la separación Users/Employees (2026-09-20), las tareas
 * se asignan a Employees (flujo móvil), no a Users -pero una FK física solo
 * puede apuntar a una tabla-. Se convierte en referencia "blanda", mismo
 * criterio ya usado en login_otps.user_code (puede apuntar a users,
 * customers o employees) y en task.createdBy/operatingExpenses.userName:
 * la integridad se valida en la aplicación (ver tasks.service.js#create),
 * no en la BD.
 */
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.removeConstraint(TASK_TABLE, 'tasks_assigned_to_fkey');
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.addConstraint(TASK_TABLE, {
      fields: ['assigned_to'],
      type: 'foreign key',
      name: 'tasks_assigned_to_fkey',
      references: {
        table: 'users',
        field: 'code'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  }
};
