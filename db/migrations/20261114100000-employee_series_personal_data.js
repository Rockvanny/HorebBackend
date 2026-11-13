'use strict';

/**
 * Empleados como clientes y proveedores (ver employee.model.js):
 *  - employee_no: nº de empleado por serie (tipo 7 'employee' en
 *    SeriesNumber.model.js#SERIES_TYPES). Es un campo NUEVO: 'code' (jperez)
 *    sigue siendo la clave y la identidad de la app móvil (login, OTP,
 *    tareas asignadas), así que no se toca.
 *  - Datos personales, dirección y laborales.
 *  - app_access: un empleado puede existir solo para nóminas, sin acceso a
 *    la app; entonces email y contraseña dejan de ser obligatorios.
 * Y en gastos operativos, entity_type ('vendor'|'employee'): a quién apunta
 * entity_code (un proveedor o un nº de empleado).
 *
 * Empleados que ya existían: si no hay ninguna serie de empleados, se crea
 * 'EMP000' (sin caducidad, como las de fichas) y se les numera por fecha de
 * alta. Idempotente.
 */
const EMPLOYEE_TYPE = 7;
const NO_EXPIRY = '9999-12-31';

const EMPLOYEE_COLUMNS = {
  employee_no: (T) => ({ type: T.STRING, allowNull: true, unique: true }),
  app_access: (T) => ({ type: T.BOOLEAN, allowNull: false, defaultValue: true }),
  phone: (T) => ({ type: T.STRING, allowNull: true }),
  document_type: (T) => ({ type: T.STRING(20), allowNull: true }),
  document_number: (T) => ({ type: T.STRING(30), allowNull: true }),
  address: (T) => ({ type: T.STRING, allowNull: true }),
  post_code: (T) => ({ type: T.STRING(10), allowNull: true }),
  city: (T) => ({ type: T.STRING, allowNull: true }),
  province: (T) => ({ type: T.STRING, allowNull: true }),
  job_title: (T) => ({ type: T.STRING, allowNull: true }),
  hire_date: (T) => ({ type: T.DATEONLY, allowNull: true }),
  termination_date: (T) => ({ type: T.DATEONLY, allowNull: true })
};

module.exports = {
  up: async ({ context: queryInterface }) => {
    const { DataTypes } = require('sequelize');
    const sequelize = queryInterface.sequelize;

    await sequelize.transaction(async (transaction) => {
      const employees = await queryInterface.describeTable('employees');
      for (const [name, def] of Object.entries(EMPLOYEE_COLUMNS)) {
        if (!employees[name]) await queryInterface.addColumn('employees', name, def(DataTypes), { transaction });
      }
      // Sin acceso a la app no hay email ni contraseña obligatorios
      await queryInterface.changeColumn('employees', 'email', { type: DataTypes.STRING, allowNull: true }, { transaction });
      await queryInterface.changeColumn('employees', 'password', { type: DataTypes.STRING, allowNull: true }, { transaction });

      const expenses = await queryInterface.describeTable('operating_expenses');
      if (!expenses.entity_type) {
        await queryInterface.addColumn('operating_expenses', 'entity_type', {
          type: DataTypes.STRING(20), allowNull: false, defaultValue: 'vendor'
        }, { transaction });
      }

      // Numerar empleados existentes
      const [pending] = await sequelize.query(
        'SELECT code FROM employees WHERE employee_no IS NULL ORDER BY created_at, code',
        { transaction }
      );
      if (!pending.length) return;

      const [series] = await sequelize.query(
        'SELECT code, last_value FROM series_numbers WHERE type = :type ORDER BY created_at LIMIT 1',
        { replacements: { type: EMPLOYEE_TYPE }, transaction }
      );
      let serie = series[0];
      if (!serie) {
        serie = { code: 'EMP000', last_value: '' };
        await sequelize.query(
          `INSERT INTO series_numbers (type, code, last_value, description, from_date, to_date, user_name, created_at, updated_at)
           VALUES (:type, :code, '', 'Empleados', CURRENT_DATE, :toDate, 'migracion', NOW(), NOW())`,
          { replacements: { type: EMPLOYEE_TYPE, code: serie.code, toDate: NO_EXPIRY }, transaction }
        );
      }

      // Mismo incremento que libs/sequence.handler.js#incrementAlphanumeric
      const { incrementAlphanumeric } = require('../../libs/sequence.handler');
      let value = serie.last_value || serie.code;
      for (const { code } of pending) {
        value = incrementAlphanumeric(value);
        await sequelize.query('UPDATE employees SET employee_no = :value WHERE code = :code',
          { replacements: { value, code }, transaction });
      }
      await sequelize.query('UPDATE series_numbers SET last_value = :value, updated_at = NOW() WHERE type = :type AND code = :code',
        { replacements: { value, type: EMPLOYEE_TYPE, code: serie.code }, transaction });
    });
  },

  down: async ({ context: queryInterface }) => {
    const employees = await queryInterface.describeTable('employees');
    for (const name of Object.keys(EMPLOYEE_COLUMNS)) {
      if (employees[name]) await queryInterface.removeColumn('employees', name);
    }
    const expenses = await queryInterface.describeTable('operating_expenses');
    if (expenses.entity_type) await queryInterface.removeColumn('operating_expenses', 'entity_type');
    // email/password se dejan admitiendo nulos: volver a NOT NULL fallaría
    // si ya hay empleados sin acceso a la app.
  }
};
